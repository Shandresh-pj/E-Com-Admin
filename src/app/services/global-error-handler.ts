import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { AlertService } from '../Securities/Services/alert.service';

/**
 * Handles unhandled client-side exceptions globally, displaying user-friendly messages
 * and preventing complete application crashes.
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const zone = this.injector.get(NgZone);
    const alertService = this.injector.get(AlertService);

    // Print error details to developer console
    console.error('[GlobalErrorHandler] Unhandled runtime exception:', error);

    // Keep UI execution within NgZone to correctly propagate state changes to the DOM
    zone.run(() => {
      const message = error?.message || error?.toString() || '';

      // Skip common, benign warnings or dev-only timing race conditions
      if (
        message.includes('ExpressionChangedAfterItHasBeenCheckedError') ||
        message.includes('ResizeObserver loop limit exceeded') ||
        message.includes('ResizeObserver loop completed with undelivered notifications')
      ) {
        return;
      }

      // Display generic warning notification to the user to reload
      alertService.error(
        'An unexpected error occurred in the application. Please reload the page if the issue persists.',
        'Application Exception'
      );
    });
  }
}
