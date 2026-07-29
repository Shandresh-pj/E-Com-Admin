import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS, UserType } from '../Models/role-access';

/**
 * Maps DB permission action strings to UI action keys.
 * Supports READ, WRITE, CREATE, UPDATE, DELETE, APPROVE, ALL, *, and FULL.
 */
const DB_ACTION_MAP: Record<string, Array<'canCreate' | 'canRead' | 'canUpdate' | 'canDelete' | 'canApprove'>> = {
  READ: ['canRead'],
  WRITE: ['canCreate'],
  CREATE: ['canCreate'],
  UPDATE: ['canUpdate'],
  DELETE: ['canDelete'],
  APPROVE: ['canApprove'],
  ALL: ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canApprove'],
  '*': ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canApprove'],
  FULL: ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canApprove'],
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

  private normalizeUserType(rawType: string): UserType {
    if (!rawType) return UserType.EMPLOYEE;
    const lower = String(rawType).toLowerCase().trim();
    if (lower === 'super_admin' || lower === 'superadmin' || lower === 'super admin') return UserType.SUPER_ADMIN;
    if (lower === 'admin') return UserType.ADMIN;
    if (lower === 'branch') return UserType.BRANCH;
    if (lower === 'branch_manager' || lower === 'branchmanager' || lower === 'branch manager') return UserType.BRANCH_MANAGER;
    if (lower === 'shopkeeper') return UserType.SHOPKEEPER;
    if (lower === 'delivery_boy' || lower === 'deliveryboy' || lower === 'delivery boy') return UserType.DELIVERY_BOY;
    if (lower === 'customer') return UserType.CUSTOMER;
    return UserType.EMPLOYEE;
  }

  /**
   * Fine-grained check: does the user hold the given action on the given menu?
   * Supports READ, WRITE, CREATE, UPDATE, DELETE, APPROVE, ALL, *, FULL.
   */
  hasPermission(menuId: number, action: string): boolean {
    this.permissionsUpdated();

    if (this.auth.isSuperAdmin()) return true;

    const permissions = this.session.getPermissions();

    if (!Array.isArray(permissions) || permissions.length === 0) {
      const userType = this.normalizeUserType(this.auth.getUserType());
      const rolePerms = ROLE_PERMISSIONS[userType];
      if (!rolePerms) return false;
      const actUpper = (action || '').toUpperCase();
      if (actUpper === 'READ') return rolePerms.canRead;
      if (actUpper === 'WRITE' || actUpper === 'CREATE') return rolePerms.canCreate;
      if (actUpper === 'UPDATE') return rolePerms.canUpdate;
      if (actUpper === 'DELETE') return rolePerms.canDelete;
      if (actUpper === 'APPROVE') return rolePerms.canApprove;
      if (actUpper === 'ALL' || actUpper === '*' || actUpper === 'FULL') return rolePerms.canRead;
      return false;
    }

    const reqActionUpper = (action || '').toUpperCase();

    return permissions.some((p: any) => {
      const pMenuId = p.menu_id ?? p.menu?.id;
      if (pMenuId !== menuId) return false;

      const actUpper = (p.action || '').toUpperCase();
      if (actUpper === 'ALL' || actUpper === '*' || actUpper === 'FULL') return true;
      if (actUpper === reqActionUpper) return true;
      if ((reqActionUpper === 'WRITE' || reqActionUpper === 'CREATE') && (actUpper === 'WRITE' || actUpper === 'CREATE')) return true;

      if (reqActionUpper === 'READ' && (p.canRead === true || p.can_read === true)) return true;
      if ((reqActionUpper === 'WRITE' || reqActionUpper === 'CREATE') && (p.canCreate === true || p.can_create === true)) return true;
      if (reqActionUpper === 'UPDATE' && (p.canUpdate === true || p.can_update === true)) return true;
      if (reqActionUpper === 'DELETE' && (p.canDelete === true || p.can_delete === true)) return true;
      if (reqActionUpper === 'APPROVE' && (p.canApprove === true || p.can_approve === true)) return true;

      return false;
    });
  }

  /**
   * Coarse-grained UI guard (hide/show buttons like Add, Edit, Delete, Approve).
   * Supports READ, WRITE, CREATE, UPDATE, DELETE, APPROVE, ALL.
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

    if (Array.isArray(permissions) && permissions.length > 0) {
      const matches = permissions.filter((p: any) => {
        const menuName = (p.menu?.name || p.menu_name || p.name || '').toLowerCase();
        const menuPath = (p.menu?.path || p.menu_path || p.path || '').toLowerCase().replace(/\/+$/, '');
        return targetNormalized === menuName || targetNormalized === menuPath || targetNormalized.startsWith(menuPath + '/');
      });

      if (matches.length > 0) {
        return matches.some((p: any) => {
          if (action === 'canRead' && (p.canRead === true || p.can_read === true)) return true;
          if (action === 'canCreate' && (p.canCreate === true || p.can_create === true)) return true;
          if (action === 'canUpdate' && (p.canUpdate === true || p.can_update === true)) return true;
          if (action === 'canDelete' && (p.canDelete === true || p.can_delete === true)) return true;
          if (action === 'canApprove' && (p.canApprove === true || p.can_approve === true || p.action === 'APPROVE')) return true;

          const actUpper = (p.action || '').toUpperCase();
          if (actUpper === 'ALL' || actUpper === '*' || actUpper === 'FULL') return true;

          const uiActions = DB_ACTION_MAP[actUpper] ?? [];
          return uiActions.includes(action);
        });
      }
    }

    const defaultPaths = [
      '/dashboard',
      '/change-password',
      '/profile',
      '/billing-history',
      '/subscription-plans',
      '/subscription-coupons',
      '/checkout',
      '/pos-billing',
      '/devices',
      '/profit-loss',
      '/attendance',
      '/leave',
      '/workforce',
      '/employees',
      '/branch',
      '/product',
      '/orders',
      '/crm-contacts',
      '/role-access',
      '/roles',
      '/product-attribute',
      '/attribute-value',
      '/category',
      '/coupons',
      '/invoices',
      '/audit-logs',
      '/stocks',
      '/branch-stocks',
      '/delivery-tracking',
      '/payments',
      '/shifts',
      '/break-policies',
      '/biometric',
      '/geofencing',
      '/workforce-requests',
      '/calendar',
      '/employee-documents',
      '/payroll',
      '/approvals',
      '/alerts',
      '/notifications'
    ];
    if (defaultPaths.some(p => targetNormalized === p || targetNormalized.startsWith(p + '/'))) {
      const userType = this.normalizeUserType(this.auth.getUserType());
      return ROLE_PERMISSIONS[userType]?.[action] ?? true;
    }

    const userType = this.normalizeUserType(this.auth.getUserType());
    return ROLE_PERMISSIONS[userType]?.[action] ?? false;
  }

  /**
   * Evaluates page-level route access for guards & sidebar filtering.
   * Super Admin has full access to ALL pages.
   * Other roles access DB Granted Role Access Matrix, DB Menus, or Role Defaults.
   */
  hasPagePermission(path: string): boolean {
    this.permissionsUpdated();

    if (this.auth.isSuperAdmin()) return true;

    // Universal accessible paths for ALL roles
    const universalPaths = [
      '/dashboard',
      '/profile',
      '/change-password',
      '/notifications',
      '/subscription-plans',
      '/unauthorized'
    ];
    const targetNormalized = (path || '').toLowerCase().replace(/\/+$/, '');
    if (universalPaths.some(p => targetNormalized === p || targetNormalized.startsWith(p + '/'))) {
      return true;
    }

    // Check DB granted permissions (Role Access Matrix)
    const permissions = this.session.getPermissions();
    if (Array.isArray(permissions) && permissions.length > 0) {
      const hasGrantedPermission = permissions.some((p: any) => {
        const menuPath = (p.menu?.path || p.menu_path || p.path || '').toLowerCase().replace(/\/+$/, '');
        const menuName = (p.menu?.name || p.menu_name || p.name || '').toLowerCase();
        
        const pathMatches = menuPath && (targetNormalized === menuPath || targetNormalized.startsWith(menuPath + '/'));
        const nameMatches = menuName && (targetNormalized === menuName || targetNormalized.startsWith(menuName + '/'));

        if (!pathMatches && !nameMatches) return false;

        if (p.is_denied === true || p.denied === true) return false;

        const actUpper = (p.action || '').toUpperCase();
        if (['READ', 'WRITE', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'ALL', '*', 'FULL'].includes(actUpper)) return true;
        if (p.canRead === true || p.can_read === true || p.canCreate === true || p.can_create === true || p.canUpdate === true || p.can_update === true || p.canDelete === true || p.can_delete === true || p.canApprove === true || p.can_approve === true) return true;

        return true;
      });

      if (hasGrantedPermission) {
        return true;
      }
    }

    // Check DB granted menus
    const menus = this.session.getMenus();
    if (Array.isArray(menus) && menus.length > 0) {
      const hasMenu = menus.some((m: any) => {
        if (typeof m === 'string') {
          if (m === 'ALL') return true;
          const strNormalized = m.toLowerCase().replace(/\/+$/, '');
          return targetNormalized === strNormalized || targetNormalized.startsWith(strNormalized + '/');
        }
        const menuPath = (m.path || m.route || m.menu_path || m.name || '').toLowerCase().replace(/\/+$/, '');
        return targetNormalized === menuPath || targetNormalized.startsWith(menuPath + '/');
      });
      if (hasMenu) return true;
    }

    // Default Role permissions fallback (Branch, Admin, Branch_Manager, etc.)
    const userType = this.normalizeUserType(this.auth.getUserType());
    const rolePerms = ROLE_PERMISSIONS[userType];
    if (rolePerms && rolePerms.canRead) {
      return true;
    }

    return false;
  }

  // ─── Domain Specific RBAC Helpers ──────────────────────────────────────────

  canApproveLeave(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.normalizeUserType(this.auth.getUserType());
    const isEmp = userType === UserType.EMPLOYEE || userType === UserType.SHOPKEEPER || userType === UserType.DELIVERY_BOY;
    if (isEmp) return false;
    return this.hasRoleAction('canApprove', '/leave');
  }

  canManagePayroll(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.normalizeUserType(this.auth.getUserType());
    return userType === UserType.ADMIN || userType === UserType.BRANCH_MANAGER || userType === UserType.BRANCH;
  }

  canManageWorkforce(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.normalizeUserType(this.auth.getUserType());
    return userType === UserType.ADMIN || userType === UserType.BRANCH_MANAGER || userType === UserType.BRANCH;
  }

  canManageEmployees(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    const userType = this.normalizeUserType(this.auth.getUserType());
    return userType === UserType.ADMIN || userType === UserType.BRANCH_MANAGER || userType === UserType.BRANCH;
  }

  isEmployeeSelfService(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return false;
    const userType = this.normalizeUserType(this.auth.getUserType());
    return userType === UserType.EMPLOYEE || userType === UserType.SHOPKEEPER || userType === UserType.DELIVERY_BOY;
  }
}
