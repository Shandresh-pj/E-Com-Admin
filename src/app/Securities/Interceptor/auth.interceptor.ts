import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';

import { inject } from '@angular/core';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { TokenService }   from '../Services/token.service';
import { AuthService }    from '../Services/auth.service';
import { RefreshService } from '../Services/refresh.service';

// Module-level refresh state — effectively a singleton for the app lifetime
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

const PUBLIC_URLS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/languages',
  '/translations',
  '/assets/i18n',
  '/health'
];

function isPublicUrl(url: string): boolean {
  return PUBLIC_URLS.some(u => url.includes(u));
}

function attachToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  tokenService: TokenService,
  refreshSvc: RefreshService,
  authService: AuthService
) {
  // Don't trigger a forced logout for public, background or localization requests
  if (
    isPublicUrl(req.url) ||
    req.url.includes('/languages') ||
    req.url.includes('/translations') ||
    req.url.includes('/assets/i18n') ||
    req.url.includes('/auth/me/permissions') ||
    req.url.includes('/notifications')
  ) {
    return throwError(() => new Error('Public/Background request unauthorized'));
  }

  const refreshToken = tokenService.getRefreshToken();

  if (!refreshToken) {
    authService.logout();
    return throwError(() => new Error('Session expired'));
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return refreshSvc.refresh(refreshToken).pipe(
      switchMap((res) => {
        isRefreshing = false;
        const newToken = res.accessToken;
        tokenService.setToken(newToken);
        refreshSubject.next(newToken);
        // Persist the rotated refresh token if the server returned one
        if ((res as any).refreshToken) {
          tokenService.setRefreshToken((res as any).refreshToken);
        }
        return next(attachToken(req, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  }

  // Another request already triggered a refresh — wait for the new token
  return refreshSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap(token => next(attachToken(req, token)))
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService  = inject(TokenService);
  const authService   = inject(AuthService);
  const refreshSvc    = inject(RefreshService);

  // Attach token if present to ensure admin APIs receive Authorization header
  const token = tokenService.getToken();
  const authReq = token ? attachToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401(req, next, tokenService, refreshSvc, authService);
      }
      return throwError(() => error);
    })
  );
};
