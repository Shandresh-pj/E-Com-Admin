import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import { SessionService } from '../Services/session.service';
import { UserType } from '../Models/role-access';
import { PermissionService } from '../Services/permissions.service';

export const RoleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);
  const permissionService = inject(PermissionService);

  const user = session.getUser();

  if (user?.isSuperAdmin || user?.userType === UserType.SUPER_ADMIN) {
    return true;
  }

  // 1. Dynamic permission check — if the DB grants this page, allow it
  //    regardless of the static roles array (permission overrides role matrix)
  const url = state.url.split('?')[0];
  if (permissionService.hasPagePermission(url)) {
    return true;
  }

  // 2. Static UserType fallback — for pages not covered by dynamic permissions
  const expectedRoles: string[] = route.data['roles'] ?? [];
  if (expectedRoles.length && !expectedRoles.includes(user?.userType)) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};
