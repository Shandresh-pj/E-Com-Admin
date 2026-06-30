import { Injectable } from '@angular/core';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS, UserType } from '../Models/role-access';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor(
    private session: SessionService,
    private auth: AuthService
  ) {}

  /**
   * Fine-grained check: does the user hold the given action on the given menu?
   * Permissions shape: [{ id, action: "READ"|"WRITE"|"UPDATE"|"DELETE"|"APPROVE", menu_id, menu: { id, name, path } }]
   * OR ["FULL_ACCESS"] for super admin (from login endpoint before select-context).
   */
  hasPermission(menuId: number, action: string): boolean {
    if (this.auth.isSuperAdmin()) return true;

    const permissions = this.session.getPermissions();

    if (!Array.isArray(permissions)) return false;
    if (permissions.includes('FULL_ACCESS')) return true;

    return permissions.some(
      (p: any) => p.menu_id === menuId && p.action === action
    );
  }

  /**
   * Checks the ROLE_PERMISSIONS matrix — no menu needed.
   * Use for coarse-grained UI guards (e.g. hide Delete button for STAFF_KEEPER).
   */
  hasRoleAction(action: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete' | 'canApprove'): boolean {
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.auth.getUserType() as UserType;
    return ROLE_PERMISSIONS[userType]?.[action] ?? false;
  }

  /**
   * Page-level check: can the user navigate to the given URL path?
   * Checks the `menus` array from the JWT.
   */
  hasPagePermission(path: string): boolean {
    if (this.auth.isSuperAdmin()) return true;

    const menus = this.session.getMenus();

    if (!Array.isArray(menus) || !menus.length) return false;
    if (menus.includes('ALL')) return true;

    return menus.some((m: any) => m.path === path);
  }
}
