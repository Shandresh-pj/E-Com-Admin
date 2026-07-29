import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import { SessionService } from '../Services/session.service';
import { UserType } from '../Models/role-access';
import { PermissionService } from '../Services/permissions.service';
import { TokenService } from '../Services/token.service';
import { map } from 'rxjs/operators';

export const RoleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);
  const permissionService = inject(PermissionService);
  const tokenService = inject(TokenService);

  if (!tokenService.getToken()) {
    router.navigate(['/authentication/login']);
    return false;
  }

  // Wait for session data to be loaded
  return session.waitForLoad().pipe(
    map(() => {
      const user = session.getUser();
      const userType = user?.userType || user?.user_type || '';

      // Super Admin always gets access
      if (user?.isSuperAdmin || userType === UserType.SUPER_ADMIN || userType === 'Super_Admin' || userType === 'super_admin') {
        return true;
      }

      const url = state.url.split('?')[0];

      // 1. Dynamic DB permission check — if the DB grants this page for the user's role/branch/company, allow it
      if (permissionService.hasPagePermission(url)) {
        return true;
      }

      // 2. Static role check from route data
      const expectedRoles: string[] = route.data['roles'] ?? [];
      if (expectedRoles.length > 0) {
        const normalizedUserType = String(userType).toLowerCase();
        const matchesRole = expectedRoles.some(r => String(r).toLowerCase() === normalizedUserType);
        if (matchesRole) {
          return true;
        }
      }

      // 3. Fallback: If no explicit expectedRoles defined, allow navigation if authenticated
      if (!expectedRoles.length) {
        return true;
      }

      // Deny & redirect to unauthorized
      console.warn(`[RoleGuard] Access denied for userType: ${userType} to URL: ${url}`);
      router.navigate(['/unauthorized']);
      return false;
    })
  );
};
