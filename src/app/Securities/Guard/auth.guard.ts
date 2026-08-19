import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { TokenService } from '../Services/token.service';

/**
 * SEC-3: AuthGuard now validates JWT expiry (not just token existence).
 *        An expired or malformed token redirects to login just like a missing token.
 *        Previously, getToken() returning any string (even "abc123") was treated as authenticated.
 */
export const AuthGuard: CanMatchFn = () => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  // isLoggedIn() validates token exists AND is not expired (SEC-3 fix)
  if (tokenService.isLoggedIn()) {
    return true;
  }

  // Token missing, expired, or malformed — redirect to login
  tokenService.clearAll(); // Clean up any stale/expired tokens
  return router.createUrlTree(['/authentication/login']);
};