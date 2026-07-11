import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  /**
   * Helper method to trigger a SweetAlert2 dialog styled with custom liquid glass classes.
   */
  fire(options: any) {
    const icon = options.icon || 'info';
    return Swal.fire({
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
        loader: `glass-loader ${options.customClass?.loader || ''}`,
        footer: `glass-footer ${options.customClass?.footer || ''}`,
        ...options.customClass
      }
    });
  }

  success(message: string, title = 'Success') {
    this.fire({
      icon: 'success',
      title,
      text: message,
      timer: 2500,
      showConfirmButton: false
    });
  }

  error(message: string, title = 'Error') {
    this.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'Dismiss'
    });
  }

  warning(message: string, title = 'Warning') {
    this.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'Got it'
    });
  }

  info(message: string, title = 'Info') {
    this.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonText: 'Got it'
    });
  }

  confirm(message: string, title = 'Confirmation') {
    return this.fire({
      icon: 'question',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    });
  }

  prompt(options: { title: string; label: string; placeholder?: string; validatorText?: string }) {
    return this.fire({
      title: options.title,
      input: 'text',
      inputLabel: options.label,
      inputPlaceholder: options.placeholder || 'Enter details...',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      inputValidator: (value: string) => {
        if (!value) {
          return options.validatorText || 'This field is required!';
        }
        return null;
      }
    });
  }
}