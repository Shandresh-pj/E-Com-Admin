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

// Module-level refresh state — effectively a singleton for the app lifetime.
// BUG-7: isRefreshing is reset in the error branch so a failed refresh never
// leaves the flag stuck at true for the remaining app session.
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

/** Non-mutating HTTP methods that don't require CSRF protection */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

function isPublicUrl(url: string): boolean {
  return PUBLIC_URLS.some(u => url.includes(u));
}

function attachToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * SEC-6: Add X-Requested-With header to all state-mutating (non-safe) requests.
 * This tells the server that the request came from an XHR/fetch (not a plain form POST).
 * Combined with SameSite=Strict cookies on the server, this prevents classic CSRF attacks.
 */
function attachCsrfHeader(req: HttpRequest<any>): HttpRequest<any> {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return req;
  return req.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } });
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
    // BUG-7: Ensure flag is reset before logout so future sessions start clean
    isRefreshing = false;
    authService.logout();
    return throwError(() => new Error('Session expired — no refresh token'));
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
        // Persist the rotated refresh token if the server returned one (SEC-8)
        if ((res as any).refreshToken) {
          tokenService.setRefreshToken((res as any).refreshToken);
        }
        return next(attachToken(req, newToken));
      }),
      catchError((err) => {
        // BUG-7: Always reset isRefreshing on failure — never leave it stuck at true
        isRefreshing = false;
        refreshSubject.next(null);
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

  // Attach Authorization Bearer token if present
  const token = tokenService.getToken();
  let authReq = token ? attachToken(req, token) : req;

  // SEC-6: Attach CSRF prevention header for all state-mutating requests
  authReq = attachCsrfHeader(authReq);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401(req, next, tokenService, refreshSvc, authService);
      }
      return throwError(() => error);
    })
  );
};
