import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertService } from '../Services/alert.service';

/**
 * Global HTTP functional interceptor for handling server-side and network errors
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const alert = inject(AlertService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse | any) => {
      // Don't intercept background/non-critical requests to avoid spamming alerts
      if (req.url.includes('/auth/me/permissions') || req.url.includes('/notifications')) {
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 400:
            alert.warning(error.error?.message || error.error || 'Bad Request');
            break;

          // 401 Unauthorized is handled exclusively by authInterceptor (token refresh + logout retry)
          case 401:
            break;

          case 403:
            alert.error(error.error?.message || 'Access denied. You do not have permissions for this resource.');
            router.navigate(['/dashboard']);
            break;

          case 404:
            alert.warning(error.error?.message || 'Resource not found');
            break;

          case 422:
            alert.error(
              formatValidationErrors(error.error),
              'Validation Failed'
            );
            break;

          case 429:
            alert.warning('Too many requests. Please wait before retrying.');
            break;

          case 500:
            alert.error(error.error?.message || 'Internal server error. Please try again later.');
            break;

          case 0:
            alert.error('Cannot connect to server. Please check your internet connection or server status.');
            break;

          default:
            alert.error(error.error?.message || error.error || 'An unexpected server error occurred.');
        }
      } else {
        alert.error('An unexpected network error occurred.');
      }

      return throwError(() => error);
    })
  );
};

/**
 * Format NestJS/Express validation error payloads cleanly for the end user
 */
function formatValidationErrors(body: any): string {
  const errors = body?.errors;
  if (!errors) return body?.message || 'Validation Failed';
  if (typeof errors === 'string') return errors;
  if (Array.isArray(errors)) return errors.join('\n');
  if (typeof errors === 'object') {
    return Object.values(errors).flat().join('\n');
  }
  return 'Validation Failed';
}
