import { inject } from '@angular/core';
import {
 CanActivateFn,
 Router
} from '@angular/router';
import { SessionService } from '../Services/session.service';
import { UserType } from '../Models/role-access';

export const RoleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const session = inject(SessionService);

  const user = session.getUser();

  if (user?.isSuperAdmin || user?.userType === UserType.SUPER_ADMIN) {
    return true;
  }

  const expectedRoles: string[] = route.data['roles'] ?? [];

  if (!expectedRoles.length) {
    return true;
  }

  if (expectedRoles.includes(user?.userType)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
