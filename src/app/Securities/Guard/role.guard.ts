import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../Services/session.service';
import { AuthService } from '../Services/auth.service';
import { PermissionService } from '../Services/permissions.service';
import { TokenService } from '../Services/token.service';
import { map } from 'rxjs/operators';

export const RoleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);
  const auth = inject(AuthService);
  const permissionService = inject(PermissionService);
  const tokenService = inject(TokenService);

  if (!tokenService.getToken()) {
    router.navigate(['/authentication/login']);
    return false;
  }

  // Wait for session data to be loaded
  return session.waitForLoad().pipe(
    map(() => {
      // Super Admin always gets access
      if (auth.isSuperAdmin()) {
        return true;
      }

      const url = state.url.split('?')[0];

      // 1. Dynamic DB permission check
      if (permissionService.hasPagePermission(url)) {
        return true;
      }

      // 2. Static role check from route data
      const expectedRoles: string[] = route.data['roles'] ?? [];
      const userType = auth.getUserType();

      if (expectedRoles.length > 0) {
        const normalizedUserType = String(userType).toLowerCase().trim();
        const matchesRole = expectedRoles.some(r => String(r).toLowerCase().trim() === normalizedUserType);
        if (matchesRole) {
          return true;
        }
      } else {
        // Fallback: allow navigation if authenticated and route has no explicit restriction
        return true;
      }

      // Deny & redirect to 403 unauthorized page
      console.warn(`[RoleGuard] Access denied for userType: ${userType} to URL: ${url}`);
      router.navigate(['/unauthorized']);
      return false;
    })
  );
};
