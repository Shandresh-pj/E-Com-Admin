import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS, UserType } from '../Models/role-access';

/**
 * Maps DB permission action strings to UI action keys.
 * WRITE covers both create and update operations.
 */
const DB_ACTION_MAP: Record<string, Array<'canCreate' | 'canRead' | 'canUpdate' | 'canDelete' | 'canApprove'>> = {
  READ:    ['canRead'],
  WRITE:   ['canCreate', 'canUpdate'],
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
   * Supports both flat (menu_id) and nested (menu.id) permission shapes from the API.
   * Also handles the string 'FULL_ACCESS' for super-admin tokens.
   */
  hasPermission(menuId: number, action: string): boolean {
    if (this.auth.isSuperAdmin()) return true;

    const permissions = this.session.getPermissions();

    if (!Array.isArray(permissions)) return false;
    if (permissions.includes('FULL_ACCESS')) return true;

    return permissions.some(
      (p: any) => (p.menu_id ?? p.menu?.id) === menuId && p.action === action
    );
  }

  /**
   * Coarse-grained UI guard (hide/show buttons like Add, Edit, Delete, Approve).
   *
   * Priority:
   *  1. SuperAdmin → always true.
   *  2. If the user has DB permissions, derive the answer from those entries
   *     (READ → canRead, WRITE → canCreate + canUpdate, DELETE → canDelete,
   *      APPROVE action OR canApprove flag → canApprove).
   *  3. Fall back to the static ROLE_PERMISSIONS matrix when no DB permissions
   *     exist (e.g. first-run or legacy tokens).
   */
  hasRoleAction(
    action: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete' | 'canApprove',
    menuNameOrPath?: string
  ): boolean {
    if (this.auth.isSuperAdmin()) return true;

    const permissions = this.session.getPermissions();
    if (!Array.isArray(permissions) || permissions.length === 0) return false;
    if (permissions.includes('FULL_ACCESS')) return true;

    // Get current path or specified path
    const target = menuNameOrPath || this.router.url.split('?')[0];
    const targetNormalized = target.toLowerCase().replace(/\/+$/, '');

    // Default universal paths fallback to role permissions matrix
    const defaultPaths = ['/dashboard', '/components/change-password', '/components/profile'];
    if (defaultPaths.some(p => targetNormalized === p || targetNormalized.startsWith(p + '/'))) {
      const userType = this.auth.getUserType() as UserType;
      return ROLE_PERMISSIONS[userType]?.[action] ?? false;
    }

    // Match database permissions based on name or path
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

    // Fallback to static role permissions matrix only if the menu doesn't exist in the database configuration
    const menus = this.session.getMenus();
    const hasMenuInDb = Array.isArray(menus) && menus.some(
      (m: any) => {
        const name = (m.name || '').toLowerCase();
        const p = (m.path || '').toLowerCase().replace(/\/+$/, '');
        return targetNormalized === name || targetNormalized === p || targetNormalized.startsWith(p + '/');
      }
    );

    if (!hasMenuInDb) {
      const userType = this.auth.getUserType() as UserType;
      return ROLE_PERMISSIONS[userType]?.[action] ?? false;
    }

    return false;
  }

  hasPagePermission(path: string): boolean {
    if (this.auth.isSuperAdmin()) return true;

    const defaultPaths = [
      '/dashboard',
      '/components/change-password',
      '/components/profile',
      '/unauthorized'
    ];
    if (defaultPaths.some(p => path === p || path.startsWith(p + '/'))) {
      return true;
    }

    const menus = this.session.getMenus();

    if (!Array.isArray(menus) || !menus.length) return false;
    if (menus.includes('ALL')) return true;

    return menus.some((m: any) => m.path === path || path.startsWith(m.path + '/'));
  }
}
