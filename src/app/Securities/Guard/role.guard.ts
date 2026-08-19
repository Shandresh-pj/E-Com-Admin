import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../Services/session.service';
import { AuthService } from '../Services/auth.service';
import { PermissionService } from '../Services/permissions.service';
import { TokenService } from '../Services/token.service';
import { environment } from 'src/environment/environment';
import { map } from 'rxjs/operators';

export const RoleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);
  const auth = inject(AuthService);
  const permissionService = inject(PermissionService);
  const tokenService = inject(TokenService);

  if (!tokenService.isLoggedIn()) {
    tokenService.clearAll();
    router.navigate(['/authentication/login']);
    return false;
  }

  // Wait for session data to be loaded before evaluating permissions.
  // This prevents a race condition on browser refresh where the session
  // is still hydrating when the guard first runs.
  return session.waitForLoad().pipe(
    map(() => {
      // Super Admin always gets full access — no further checks needed.
      if (auth.isSuperAdmin()) {
        return true;
      }

      const url = state.url.split('?')[0];

      // Primary check: DB-driven permission for this page path.
      if (permissionService.hasPagePermission(url)) {
        return true;
      }

      // SEC-15: Never expose internal route/role info in production logs.
      if (!environment.production) {
        console.warn(`[RoleGuard] Access denied for userType="${auth.getUserType()}" on URL: ${url}`);
      }

      router.navigate(['/unauthorized']);
      return false;
    })
  );
};

