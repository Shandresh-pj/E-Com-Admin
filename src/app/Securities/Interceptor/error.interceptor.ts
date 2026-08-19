import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertService } from '../Services/alert.service';
import { AuthService } from '../Services/auth.service';

/**
 * Global HTTP functional interceptor — handles server-side and network errors.
 *
 * SEC-7:  Removed the `router.url.includes('/dashboard')` blanket suppressor that
 *         silently swallowed ALL errors (500, 403, etc.) while on any dashboard page.
 *
 * SEC-11: On 403, permissions are refreshed from the API — stale DB cache is the
 *         most common cause of spurious 403s when an admin changes roles.
 *
 * BUG-6:  Removed /roles and /companies from the silent-suppression list;
 *         those are critical setup APIs — failures must surface to the user.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const alert  = inject(AlertService);
  const router = inject(Router);
  const auth   = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse | any) => {

      // Suppress only genuinely background / polling endpoints that fire every few
      // seconds and whose errors should never disrupt the user's workflow with a toast.
      const isSilentEndpoint =
        req.url.includes('/auth/me/permissions') ||  // Permission polling
        req.url.includes('/notifications')         ||  // Badge count polling
        req.url.includes('/devices');                  // Auto-detect hardware ping

      if (isSilentEndpoint) {
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 400:
            alert.warning(error.error?.message || error.error || 'Bad Request — check your input.');
            break;

          // 401 Unauthorized is handled exclusively by authInterceptor (token refresh + logout retry).
          case 401:
            break;

          case 403:
            alert.error(error.error?.message || 'Access denied — your role does not permit this action.');
            // SEC-11: Refresh permissions — role may have changed since last load.
            // Fire-and-forget; we don't wait for this to complete before throwing.
            auth.refreshPermissions().subscribe({ error: () => {} });
            break;

          case 404:
            alert.warning(error.error?.message || 'Resource not found.');
            break;

          case 409:
            alert.warning(error.error?.message || 'Conflict — this record already exists.');
            break;

          case 422:
            alert.error(
              formatValidationErrors(error.error),
              'Validation Failed'
            );
            break;

          case 429:
            alert.warning('Too many requests — please wait before retrying.');
            break;

          case 500:
            alert.error(error.error?.message || 'Internal server error. Please try again later.');
            break;

          case 502:
          case 503:
          case 504:
            alert.error('Service temporarily unavailable. Please try again in a few moments.');
            break;

          default:
            if (error.status >= 500) {
              alert.error('An unexpected server error occurred. Please try again.');
            } else if (error.status === 0) {
              // Network error / CORS failure — no response at all
              alert.error('Cannot reach the server. Check your network connection.');
            }
            break;
        }
      }

      return throwError(() => error);
    })
  );
};

function formatValidationErrors(errorData: any): string {
  if (!errorData) return 'Invalid input data';
  if (typeof errorData === 'string') return errorData;
  if (errorData.message && typeof errorData.message === 'string') return errorData.message;

  if (errorData.errors && Array.isArray(errorData.errors)) {
    return errorData.errors.map((e: any) => e.msg || e.message || String(e)).join(', ');
  }

  if (typeof errorData === 'object') {
    const messages: string[] = [];
    Object.keys(errorData).forEach(key => {
      const val = errorData[key];
      if (Array.isArray(val)) {
        messages.push(`${key}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        messages.push(`${key}: ${val}`);
      }
    });
    if (messages.length > 0) return messages.join('; ');
  }

  return 'Validation failed';
}
