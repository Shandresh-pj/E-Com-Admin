import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  /**
   * Core fire method — applies the Liquid Glass custom classes.
   */
  fire(options: any) {
    const icon = options.icon || 'info';

    // Strictly default to false unless explicitly overridden
    const showCancelButton = options.showCancelButton ?? false;
    const showDenyButton = options.showDenyButton ?? false;

    return Swal.fire({
      showCancelButton,
      showDenyButton,
      backdrop: true,
      buttonsStyling: false,
      heightAuto: false,
      showClass: {
        popup: 'glass-popup-show',
        backdrop: 'glass-backdrop-show'
      },
      hideClass: {
        popup: 'glass-popup-hide',
        backdrop: 'glass-backdrop-hide'
      },
      ...options,
      customClass: {
        container: 'glass-backdrop',
        popup: `glass-popup glass-${icon} ${options.customClass?.popup || ''}`,
        title: `glass-title ${options.customClass?.title || ''}`,
        htmlContainer: `glass-content ${options.customClass?.htmlContainer || ''}`,
        confirmButton: `glass-btn glass-btn-confirm ${options.customClass?.confirmButton || ''}`,
        cancelButton: `glass-btn glass-btn-cancel ${options.customClass?.cancelButton || ''}`,
        denyButton: `glass-btn glass-btn-deny ${options.customClass?.denyButton || ''}`,
        input: `glass-input ${options.customClass?.input || ''}`,
        actions: `glass-actions ${options.customClass?.actions || ''}`,
        footer: `glass-footer ${options.customClass?.footer || ''}`,
        ...options.customClass
      }
    });
  }

  /** Auto-dismisses in 3 s but also shows a button */
  success(message: string, title = 'Success') {
    this.fire({
      icon: 'success',
      title,
      text: message,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false
      // confirmButtonText: 'Continue'
    });
  }

  /** Single small dismiss button */
  error(message: string, title = 'Error') {
    this.fire({
      icon: 'error',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: false,
      showDenyButton: false,
      showCloseButton: false,
      confirmButtonText: 'Dismiss'
    });
  }

  /** Single small dismiss button */
  warning(message: string, title = 'Warning') {
    this.fire({
      icon: 'warning',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: false,
      showDenyButton: false,
      showCloseButton: false,
      confirmButtonText: 'Got it'
    });
  }

  /** Single small dismiss button */
  info(message: string, title = 'Info') {
    this.fire({
      icon: 'info',
      title,
      text: message,
      showConfirmButton: true,
      showCancelButton: false,
      showDenyButton: false,
      showCloseButton: false,
      confirmButtonText: 'OK'
    });
  }

  /** Two buttons — Confirm / Cancel */
  confirm(message: string, title = 'Are you sure?') {
    return this.fire({
      icon: 'question',
      title,
      text: message,
      showCancelButton: true,
      showDenyButton: false,
      showCloseButton: false,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel'
    });
  }

  /** Two buttons — Submit / Cancel with a text input */
  prompt(options: { title: string; label: string; placeholder?: string; validatorText?: string }) {
    return this.fire({
      title: options.title,
      input: 'text',
      inputLabel: options.label,
      inputPlaceholder: options.placeholder || 'Enter details...',
      showCancelButton: true,
      showDenyButton: false,
      showCloseButton: false,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      inputValidator: (value: string) => {
        if (!value) return options.validatorText || 'This field is required!';
        return null;
      }
    });
  }
}