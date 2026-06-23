import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  success(message: string, title = 'Success') {
    Swal.fire({
      icon: 'success',
      title,
      text: message,
      timer: 2000,
      showConfirmButton: false
    });
  }

  error(message: string, title = 'Error') {
    Swal.fire({
      icon: 'error',
      title,
      text: message
    });
  }

  warning(message: string, title = 'Warning') {
    Swal.fire({
      icon: 'warning',
      title,
      text: message
    });
  }

  info(message: string, title = 'Info') {
    Swal.fire({
      icon: 'info',
      title,
      text: message
    });
  }

  confirm(message: string) {
    return Swal.fire({
      icon: 'question',
      title: 'Confirmation',
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    });
  }
}