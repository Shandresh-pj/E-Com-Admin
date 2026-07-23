import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS, UserType } from '../Models/role-access';

/**
 * Maps DB permission action strings to UI action keys.
 * Each DB action maps to exactly one UI action — WRITE (create) and UPDATE
 * are distinct, independently-grantable permissions and must never imply
 * each other.
 */
const DB_ACTION_MAP: Record<string, Array<'canCreate' | 'canRead' | 'canUpdate' | 'canDelete' | 'canApprove'>> = {
  READ:    ['canRead'],
  WRITE:   ['canCreate'],
  UPDATE:  ['canUpdate'],
  DELETE:  ['canDelete'],
  APPROVE: ['canApprove'],
};

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  permissionsUpdated = signal<number>(0);

  constructor(
    private session: SessionService,
    private auth: AuthService,
    private router: Router
  ) {
    this.session.permissionsChanged$.subscribe(() => {
      this.permissionsUpdated.update(v => v + 1);
    });
  }

  /**
   * Fine-grained check: does the user hold the given action on the given menu?
   * ONLY Super Admin possesses full system access.
   */
  hasPermission(menuId: number, action: string): boolean {
    this.permissionsUpdated();

    if (this.auth.isSuperAdmin()) return true;

    const permissions = this.session.getPermissions();

    if (!Array.isArray(permissions)) return false;

    return permissions.some(
      (p: any) => (p.menu_id ?? p.menu?.id) === menuId && p.action === action
    );
  }

  /**
   * Coarse-grained UI guard (hide/show buttons like Add, Edit, Delete, Approve).
   *
   * Priority:
   *  1. SuperAdmin ONLY → always true.
   *  2. If the user has DB permissions, derive the answer from those entries.
   *  3. Fall back to static ROLE_PERMISSIONS matrix when no DB permissions exist.
   */
  hasRoleAction(
    action: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete' | 'canApprove',
    menuNameOrPath?: string
  ): boolean {
    this.permissionsUpdated();

    if (this.auth.isSuperAdmin()) return true;

    const permissions = this.session.getPermissions();

    const target = menuNameOrPath || this.router.url.split('?')[0];
    const targetNormalized = target.toLowerCase().replace(/\/+$/, '');

    const defaultPaths = [
      '/dashboard',
      '/change-password',
      '/profile',
      '/billing-history',
      '/subscription-plans',
      '/subscription-coupons',
      '/checkout'
    ];
    if (defaultPaths.some(p => targetNormalized === p || targetNormalized.startsWith(p + '/'))) {
      const userType = this.auth.getUserType() as UserType;
      return ROLE_PERMISSIONS[userType]?.[action] ?? false;
    }

    if (Array.isArray(permissions) && permissions.length > 0) {
      const hasMatch = permissions.some((p: any) => {
        const menuName = (p.menu?.name || '').toLowerCase();
        const menuPath = (p.menu?.path || '').toLowerCase().replace(/\/+$/, '');
        const isMatch = targetNormalized === menuName || targetNormalized === menuPath || targetNormalized.startsWith(menuPath + '/');
        if (isMatch) {
          if (action === 'canApprove') {
            return p.canApprove === true || p.action === 'APPROVE';
          }
          const uiActions = DB_ACTION_MAP[p.action] ?? [];
          return uiActions.includes(action);
        }
        return false;
      });

      if (hasMatch) return true;
    }

    const userType = this.auth.getUserType() as UserType;
    return ROLE_PERMISSIONS[userType]?.[action] ?? false;
  }

  /**
   * Evaluates page-level route access for guards & sidebar filtering.
   * ONLY Super Admin gets unrestricted access to all pages.
   */
  hasPagePermission(path: string): boolean {
    this.permissionsUpdated();

    if (this.auth.isSuperAdmin()) return true;

    const defaultPaths = [
      '/dashboard',
      '/change-password',
      '/profile',
      '/unauthorized'
    ];
    if (defaultPaths.some(p => path === p || path.startsWith(p + '/'))) {
      return true;
    }

    const menus = this.session.getMenus();

    if (!Array.isArray(menus) || !menus.length) {
      const userType = this.auth.getUserType() as UserType;
      const perms = ROLE_PERMISSIONS[userType];
      return perms?.canRead ?? false;
    }

    const targetNormalized = path.toLowerCase().replace(/\/+$/, '');

    return menus.some((m: any) => {
      if (typeof m === 'string') {
        if (m === 'ALL') return false; // ONLY Super Admin has full access to ALL
        const strNormalized = m.toLowerCase().replace(/\/+$/, '');
        return targetNormalized === strNormalized || targetNormalized.startsWith(strNormalized + '/');
      }
      const menuPath = (m.path || m.route || m.name || '').toLowerCase().replace(/\/+$/, '');
      return targetNormalized === menuPath || targetNormalized.startsWith(menuPath + '/');
    });
  }

  // ─── Domain Specific RBAC Helpers ──────────────────────────────────────────

  canApproveLeave(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.auth.getUserType();
    const isEmp = userType === UserType.EMPLOYEE || userType === UserType.SHOPKEEPER || userType === UserType.DELIVERY_BOY;
    if (isEmp) return false;
    return this.hasRoleAction('canApprove', '/leave');
  }

  canManagePayroll(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.auth.getUserType();
    return userType === UserType.ADMIN || userType === UserType.BRANCH_MANAGER;
  }

  canManageWorkforce(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.auth.getUserType();
    return userType === UserType.ADMIN || userType === UserType.BRANCH_MANAGER;
  }

  canManageEmployees(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.auth.getUserType();
    return userType === UserType.ADMIN || userType === UserType.BRANCH_MANAGER;
  }

  isEmployeeSelfService(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return false;
    const userType = this.auth.getUserType();
    return userType === UserType.EMPLOYEE || userType === UserType.SHOPKEEPER || userType === UserType.DELIVERY_BOY;
  }
}
