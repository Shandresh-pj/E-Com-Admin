import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '../Securities/Services/alert.service';
import { environment } from 'src/environment/environment';

/**
 * Handles unhandled client-side exceptions globally.
 *
 * BUG-8: Fixed overly broad string-based suppressors.
 *        Previously, any error whose .message contained "404" or "500" was silently
 *        swallowed — this incorrectly suppressed legitimate runtime errors like:
 *        "Error parsing row 404 in CSV" or "Config item 500 not found".
 *        HTTP errors are filtered by instanceof check only, not by string content.
 *
 * SEC-15: console.error is now gated behind !environment.production so internal
 *         stack traces and route paths are not visible to end users in production.
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  private isHandlingError = false;

  constructor(private injector: Injector) {}

  handleError(error: any): void {
    if (this.isHandlingError) {
      return;
    }
    this.isHandlingError = true;

    try {
      // Unwrap promise/zone rejections that wrap the original error
      const actualError = error?.rejection || error?.originalError || error;

      // SEC-15: Only log to console in development
      if (!environment.production) {
        console.error('[GlobalErrorHandler] Unhandled runtime exception:', actualError);
      }

      // HTTP errors are fully handled by auth.interceptor + error.interceptor.
      // Check by instance or by duck-typing the HttpErrorResponse shape.
      if (
        actualError instanceof HttpErrorResponse ||
        (actualError?.status !== undefined && actualError?.headers !== undefined)
      ) {
        return;
      }

      const message: string = actualError?.message || actualError?.toString() || '';

      // BUG-8: Suppress only well-known Angular lifecycle/browser noise messages —
      // NOT by substring matches on HTTP status codes ("404", "500").
      // Use startsWith/exact-match checks, NOT .includes() on numeric strings.
      const isBenignNoise =
        message.startsWith('ExpressionChangedAfterItHasBeenCheckedError') ||
        message.includes('ResizeObserver loop limit exceeded') ||
        message.includes('ResizeObserver loop completed with undelivered notifications') ||
        message.includes('NavigationCancelled') ||
        message.includes('Cannot match any routes') ||
        // These are known-handled errors re-thrown from error.interceptor — suppress here
        // to prevent a second user-visible toast for the same API failure.
        message.includes('Http failure response');

      if (isBenignNoise) return;

      // Only notify the user for actual unhandled JS runtime crashes
      const zone = this.injector.get(NgZone);
      const alertService = this.injector.get(AlertService);

      zone.run(() => {
        alertService.error(
          'An unexpected error occurred. Please reload the page if the issue persists.',
          'Application Error'
        );
      });
    } finally {
      setTimeout(() => {
        this.isHandlingError = false;
      }, 1000);
    }
  }
}
