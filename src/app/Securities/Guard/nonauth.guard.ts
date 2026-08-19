import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { TokenService } from '../Services/token.service';

/**
 * Prevents authenticated users from accessing auth pages (login, register, forgot-password).
 * SEC-3: Now uses tokenService.isLoggedIn() which validates JWT expiry,
 *        not just token existence — expired tokens won't redirect to dashboard.
 */
export const NonAuthGuard: CanMatchFn = () => {
  const router       = inject(Router);
  const tokenService = inject(TokenService);

  // isLoggedIn() checks token existence AND JWT expiry (SEC-3)
  if (tokenService.isLoggedIn()) {
    // Already authenticated and token is valid — redirect to dashboard
    return router.createUrlTree(['/dashboard']);
  }

  // Token missing or expired — allow access to auth pages
  return true;
};