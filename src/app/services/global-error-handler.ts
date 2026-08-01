import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '../Securities/Services/alert.service';

/**
 * Handles unhandled client-side exceptions globally.
 * Filters out handled HTTP exceptions, harmless Angular lifecycle timing warnings,
 * and ResizeObserver loop messages to prevent annoying application exception dialogs.
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    // Extract error unwrapped if wrapped in Promise/RxJS rejection wrapper
    const actualError = error?.rejection || error?.originalError || error;

    // Log full error details in developer console for diagnostics
    console.error('[GlobalErrorHandler] Unhandled runtime exception:', actualError);

    // Ignore HTTP errors — error.interceptor.ts and auth.interceptor.ts already handle them with specific toasts/redirects!
    if (
      actualError instanceof HttpErrorResponse ||
      actualError?.status !== undefined ||
      actualError?.name === 'HttpErrorResponse' ||
      actualError?.headers !== undefined
    ) {
      return;
    }

    const message = actualError?.message || actualError?.toString() || '';

    // Ignore benign browser/lifecycle timing warnings and handled API rejections
    if (
      message.includes('ExpressionChangedAfterItHasBeenCheckedError') ||
      message.includes('ResizeObserver loop limit exceeded') ||
      message.includes('ResizeObserver loop completed with undelivered notifications') ||
      message.includes('NavigationCancelled') ||
      message.includes('Cannot match any routes') ||
      message.includes('Fare estimation failed') ||
      message.includes('Http failure response') ||
      message.includes('404') ||
      message.includes('429') ||
      message.includes('500')
    ) {
      return;
    }

    // Only dispatch user notification if it is an actual unhandled JS runtime crash
    const zone = this.injector.get(NgZone);
    const alertService = this.injector.get(AlertService);

    zone.run(() => {
      alertService.error(
        'An unexpected error occurred in the application. Please reload the page if the issue persists.',
        'Application Exception'
      );
    });
  }
}
