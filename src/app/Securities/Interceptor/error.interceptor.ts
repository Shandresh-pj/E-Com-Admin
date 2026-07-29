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
      // Don't intercept background/dashboard/lookup requests to avoid spamming alerts
      if (
        req.url.includes('/auth/me/permissions') ||
        req.url.includes('/notifications') ||
        req.url.includes('/devices') ||
        req.url.includes('/pos') ||
        req.url.includes('/roles') ||
        req.url.includes('/companies') ||
        req.url.includes('/branches') ||
        router.url.includes('/dashboard')
      ) {
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
            alert.error(error.error?.message || 'Access denied: insufficient role privileges.');
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

          default:
            if (error.status >= 500) {
              alert.error('An unexpected server error occurred.');
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
    return errorData.errors.map((e: any) => e.msg || e.message || e).join(', ');
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
