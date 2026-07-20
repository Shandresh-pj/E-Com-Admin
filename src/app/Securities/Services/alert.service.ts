import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

export interface PromptOptions {
  title: string;
  label?: string;
  placeholder?: string;
  validatorText?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  /**
   * Core execution method — standardizes all popups into the enterprise
   * liquid glassmorphism theme with a strict limit of 1 or 2 action buttons.
   */
  fire(options: SweetAlertOptions): Promise<SweetAlertResult<any>> {
    // Prevent multiple alerts from overlapping — close any existing popup cleanly
    if (Swal.isVisible()) {
      Swal.close();
    }

    const icon = options.icon || 'info';

    // Merge options while enforcing strict button rules
    const mergedOptions: SweetAlertOptions = {
      backdrop: true,
      buttonsStyling: false,
      heightAuto: false,
      allowOutsideClick: options.allowOutsideClick ?? true,
      allowEscapeKey: options.allowEscapeKey ?? true,
      showConfirmButton: options.showConfirmButton ?? true,
      showCancelButton: options.showCancelButton ?? false,
      showCloseButton: options.showCloseButton ?? false,
      showClass: {
        popup: 'glass-popup-show',
        backdrop: 'glass-backdrop-show'
      },
      hideClass: {
        popup: 'glass-popup-hide',
        backdrop: 'glass-backdrop-hide'
      },
      ...options,
      // STRICT CONSTRAINT: Deny button is FORBIDDEN unconditionally (max 2 buttons: Confirm + Cancel)
      showDenyButton: false,
      customClass: {
        container: 'glass-backdrop',
        popup: `glass-popup glass-${icon} ${options.customClass?.popup || ''}`,
        title: `glass-title ${options.customClass?.title || ''}`,
        htmlContainer: `glass-content ${options.customClass?.htmlContainer || ''}`,
        confirmButton: `glass-btn glass-btn-confirm ${options.customClass?.confirmButton || ''}`,
        cancelButton: `glass-btn glass-btn-cancel ${options.customClass?.cancelButton || ''}`,
        input: `glass-input ${options.customClass?.input || ''}`,
        actions: `glass-actions ${options.customClass?.actions || ''}`,
        footer: `glass-footer ${options.customClass?.footer || ''}`,
        timerProgressBar: `glass-progress-bar ${options.customClass?.timerProgressBar || ''}`,
        ...options.customClass
      }
    };

    return Swal.fire(mergedOptions);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STANDARDIZED ALERT TYPES (Strict 1 or 2 Buttons Only)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 1. Success Alert — Emerald Glass (Auto Dismiss 3s or Single "OK" Button)
   */
  success(message: string, title = 'Success!', timer = 3000): Promise<SweetAlertResult<any>> {
    const isAutoDismiss = timer > 0;
    return this.fire({
      icon: 'success',
      title,
      text: message,
      timer: isAutoDismiss ? timer : undefined,
      timerProgressBar: isAutoDismiss,
      showConfirmButton: !isAutoDismiss,
      showCancelButton: false,
      confirmButtonText: 'OK'
    });
  }

  /**
   * 2. Error Alert — Crimson Glass (Single "Dismiss" Button)
   */
  error(message: string, title = 'Error!'): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'error',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: 'Dismiss'
    });
  }

  /**
   * 3. Warning Alert — Amber Glass (Single "Got it" Button)
   */
  warning(message: string, title = 'Warning!'): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'warning',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: 'Got it'
    });
  }

  /**
   * 4. Info Alert — Sapphire Blue Glass (Single "OK" Button)
   */
  info(message: string, title = 'Information'): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'info',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: 'OK'
    });
  }

  /**
   * 5. Confirm Dialog — Violet Glass (2 Buttons: Confirm + Cancel)
   */
  confirm(
    message: string,
    title = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'question',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    });
  }

  /**
   * 6. Delete Confirmation — Orange/Amber Glass with Trash Icon (2 Buttons: Confirm + Cancel)
   */
  deleteConfirm(
    message = 'This item will be permanently deleted and cannot be recovered.',
    title = 'Delete this item?'
  ): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'warning',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'glass-delete-popup',
        confirmButton: 'glass-btn glass-btn-danger'
      }
    });
  }

  /**
   * 7. Prompt Input Dialog — Cyan Glass (2 Buttons: Submit + Cancel)
   */
  prompt(options: PromptOptions): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'question',
      title: options.title,
      input: 'text',
      inputLabel: options.label,
      inputPlaceholder: options.placeholder || 'Enter details...',
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Submit',
      cancelButtonText: options.cancelButtonText || 'Cancel',
      customClass: {
        popup: 'glass-prompt-popup'
      },
      inputValidator: (value: string) => {
        if (!value || !value.trim()) {
          return options.validatorText || 'This field is required!';
        }
        return null;
      }
    });
  }

  /**
   * 8. Authentication / Session Expired Alert — Shield Icon (Single "Login" Button)
   */
  auth(
    message = 'Your session has expired. Please log in to continue.',
    title = 'Session Expired',
    buttonText = 'Login'
  ): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'info',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: buttonText,
      allowOutsideClick: false,
      customClass: {
        popup: 'glass-auth-popup'
      }
    });
  }

  /**
   * 9. Payment Successful Alert — Emerald Glass (2 Buttons: View Invoice + Close)
   */
  paymentSuccess(
    message = 'Your payment has been processed successfully.',
    title = 'Payment Successful!',
    onViewInvoice?: () => void
  ): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'success',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: 'View Invoice',
      cancelButtonText: 'Close',
      customClass: {
        popup: 'glass-payment-popup'
      }
    }).then(result => {
      if (result.isConfirmed && onViewInvoice) {
        onViewInvoice();
      }
      return result;
    });
  }

  /**
   * 10. System Notification with Glass Footer — Deep Blue (Single "Learn More" / "OK" Button)
   */
  notification(
    message: string,
    title = 'New Notification',
    footerText = 'Version 2.5.0 • Released Today',
    actionText = 'Learn More',
    onAction?: () => void
  ): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'info',
      title,
      text: message,
      footer: `<div class="glass-footer-content"><span>${footerText}</span></div>`,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: actionText,
      customClass: {
        popup: 'glass-notification-popup'
      }
    }).then(result => {
      if (result.isConfirmed && onAction) {
        onAction();
      }
      return result;
    });
  }

  /**
   * 11. Subscription Upgrade Alert — Crown/Diamond Theme (2 Buttons: Upgrade Now + Cancel)
   */
  subscriptionAlert(
    message = 'Upgrade to access premium workforce & analytics features.',
    title = 'Upgrade Plan',
    confirmText = 'Upgrade Now',
    cancelText = 'Cancel'
  ): Promise<SweetAlertResult<any>> {
    return this.fire({
      icon: 'info',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      customClass: {
        popup: 'glass-subscription-popup',
        confirmButton: 'glass-btn glass-btn-primary'
      }
    });
  }

  /**
   * Close any active alert programmatically
   */
  close(): void {
    if (Swal.isVisible()) {
      Swal.close();
    }
  }
}