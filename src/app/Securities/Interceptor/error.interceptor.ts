import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';

import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Router } from '@angular/router';
import { AlertService } from '../Services/alert.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(
    private alert: AlertService,
    private router: Router
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    return next.handle(req).pipe(

      catchError((error: HttpErrorResponse) => {

        switch (error.status) {

          case 400:
            this.alert.warning(error.error?.message || 'Bad Request');
            break;

          // 401 is handled by authInterceptor (token refresh + logout).
          // Do not handle here — pass it through so the retry can work.
          case 401:
            break;

          case 403:
            this.alert.error('Access denied');
            this.router.navigate(['/dashboard']);
            break;

          case 404:
            this.alert.warning('Resource not found');
            break;

          case 422:
            this.alert.error(
              this.formatValidationErrors(error.error),
              'Validation Failed'
            );
            break;

          case 429:
            this.alert.warning('Too many requests. Please wait.');
            break;

          case 500:
            this.alert.error('Internal server error');
            break;

          case 0:
            this.alert.error('Cannot connect to server');
            break;

          default:
            this.alert.error(error.error?.message || 'Something went wrong');
        }

        return throwError(() => error);
      })

    );
  }

  private formatValidationErrors(body: any): string {
    const errors = body?.errors;
    if (!errors) return body?.message || 'Validation Failed';
    return Object.values(errors).flat().join('\n');
  }
}
