import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DesktopService } from '../../services/desktop.service';
import { TokenService } from '../Services/token.service';

/**
 * DesktopRouteGuard:
 * Completely blocks Web-only public landing pages (Home, Contact) on Desktop UI.
 * If accessed in Desktop environment, safely redirects to /dashboard (if authenticated)
 * or /authentication/login (if unauthenticated).
 */
export const DesktopRouteGuard: CanActivateFn = () => {
  const desktopService = inject(DesktopService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (desktopService.isDesktop) {
    if (tokenService.isLoggedIn()) {
      return router.createUrlTree(['/dashboard']);
    } else {
      return router.createUrlTree(['/authentication/login']);
    }
  }

  return true;
};
