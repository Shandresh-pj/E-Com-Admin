import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS, PermissionAction, UserType } from '../Models/role-access';

/**
 * Maps DB permission action strings to UI action keys.
 * Extended to cover all granular actions supported by the RBAC system.
 */
const DB_ACTION_MAP: Record<string, PermissionAction[]> = {
  READ:        ['canRead'],
  WRITE:       ['canCreate'],
  CREATE:      ['canCreate'],
  UPDATE:      ['canUpdate'],
  DELETE:      ['canDelete'],
  APPROVE:     ['canApprove'],
  EXPORT:      ['canExport'],
  IMPORT:      ['canImport'],
  ASSIGN:      ['canAssign'],
  REVOKE:      ['canRevoke'],
  ACTIVATE:    ['canActivate'],
  DEACTIVATE:  ['canDeactivate'],
  RESTORE:     ['canRestore'],
  MANAGE:      ['canManage'],
  CONFIGURE:   ['canConfigure'],
  ALL: [
    'canRead', 'canCreate', 'canUpdate', 'canDelete', 'canApprove',
    'canExport', 'canImport', 'canAssign', 'canRevoke', 'canActivate',
    'canDeactivate', 'canRestore', 'canManage', 'canConfigure',
  ],
  '*': [
    'canRead', 'canCreate', 'canUpdate', 'canDelete', 'canApprove',
    'canExport', 'canImport', 'canAssign', 'canRevoke', 'canActivate',
    'canDeactivate', 'canRestore', 'canManage', 'canConfigure',
  ],
  FULL: [
    'canRead', 'canCreate', 'canUpdate', 'canDelete', 'canApprove',
    'canExport', 'canImport', 'canAssign', 'canRevoke', 'canActivate',
    'canDeactivate', 'canRestore', 'canManage', 'canConfigure',
  ],
};

/**
 * Paths universally accessible by ALL authenticated users regardless of role or
 * DB-assigned permissions. These never need an explicit permission grant.
 */
const UNIVERSAL_PATHS = [
  '/dashboard',
  '/profile',
  '/change-password',
  '/notifications',
  '/unauthorized',
];

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  /** Signal incremented whenever permissions change; use in computed/effects. */
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

  // ─── Core permission matching helpers ──────────────────────────────────────

  /**
   * Returns true if any DB permission entry matches the given path and action key.
   * Path matching is prefix-aware (e.g. /orders also matches /orders/123).
   */
  private matchesDbPermission(path: string, action: PermissionAction): boolean {
    const permissions = this.session.getPermissions();
    if (!Array.isArray(permissions) || permissions.length === 0) return false;

    const targetNorm = (path || '').toLowerCase().replace(/\/+$/, '');

    return permissions.some((p: any) => {
      // Match menu by path or name
      const menuPath = (p.menu?.path || p.menu_path || p.path || '').toLowerCase().replace(/\/+$/, '');
      const menuName = (p.menu?.name || p.menu_name || p.name || '').toLowerCase();

      const pathMatches = menuPath && (targetNorm === menuPath || targetNorm.startsWith(menuPath + '/'));
      const nameMatches = menuName && (targetNorm === menuName || targetNorm.startsWith(menuName + '/'));
      if (!pathMatches && !nameMatches) return false;

      if (p.is_denied === true || p.denied === true) return false;

      // Check action
      const actUpper = (p.action || '').toUpperCase();
      if (actUpper === 'ALL' || actUpper === '*' || actUpper === 'FULL') return true;

      const uiActions: PermissionAction[] = DB_ACTION_MAP[actUpper] ?? [];
      if (uiActions.includes(action)) return true;

      // Check boolean flags directly on the permission record
      const flagMap: Record<PermissionAction, string[]> = {
        canRead:       ['canRead', 'can_read'],
        canCreate:     ['canCreate', 'can_create'],
        canUpdate:     ['canUpdate', 'can_update'],
        canDelete:     ['canDelete', 'can_delete'],
        canApprove:    ['canApprove', 'can_approve'],
        canExport:     ['canExport', 'can_export'],
        canImport:     ['canImport', 'can_import'],
        canAssign:     ['canAssign', 'can_assign'],
        canRevoke:     ['canRevoke', 'can_revoke'],
        canActivate:   ['canActivate', 'can_activate'],
        canDeactivate: ['canDeactivate', 'can_deactivate'],
        canRestore:    ['canRestore', 'can_restore'],
        canManage:     ['canManage', 'can_manage'],
        canConfigure:  ['canConfigure', 'can_configure'],
      };
      const flags = flagMap[action] ?? [];
      return flags.some(f => p[f] === true);
    });
  }

  /**
   * Returns true if the user has any DB permission (any action) for the given path.
   * Used for page-level access checks in route guards and sidebar filtering.
   */
  private hasAnyDbPermissionForPath(path: string): boolean {
    const permissions = this.session.getPermissions();
    if (!Array.isArray(permissions) || permissions.length === 0) return false;

    const targetNorm = (path || '').toLowerCase().replace(/\/+$/, '');

    return permissions.some((p: any) => {
      if (p.is_denied === true || p.denied === true) return false;

      const menuPath = (p.menu?.path || p.menu_path || p.path || '').toLowerCase().replace(/\/+$/, '');
      const menuName = (p.menu?.name || p.menu_name || p.name || '').toLowerCase();

      const pathMatches = menuPath && (targetNorm === menuPath || targetNorm.startsWith(menuPath + '/'));
      const nameMatches = menuName && (targetNorm === menuName || targetNorm.startsWith(menuName + '/'));

      if (!pathMatches && !nameMatches) return false;

      const actUpper = (p.action || '').toUpperCase();
      if (['READ', 'WRITE', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', 'IMPORT',
           'ASSIGN', 'REVOKE', 'ACTIVATE', 'DEACTIVATE', 'RESTORE', 'MANAGE', 'CONFIGURE',
           'ALL', '*', 'FULL'].includes(actUpper)) return true;

      // Any positive boolean flag counts
      const positiveFlags = [
        'canRead', 'can_read', 'canCreate', 'can_create',
        'canUpdate', 'can_update', 'canDelete', 'can_delete',
        'canApprove', 'can_approve', 'canExport', 'can_export',
      ];
      return positiveFlags.some(f => p[f] === true);
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Fine-grained check: does the user hold the given action on the given menu ID?
   * Supports READ, WRITE, CREATE, UPDATE, DELETE, APPROVE, EXPORT, IMPORT,
   * ASSIGN, REVOKE, ACTIVATE, DEACTIVATE, RESTORE, MANAGE, CONFIGURE, ALL, *, FULL.
   */
  hasPermission(menuId: number, action: string): boolean {
    this.permissionsUpdated();

    if (this.auth.isSuperAdmin()) return true;

    const permissions = this.session.getPermissions();
    if (!Array.isArray(permissions) || permissions.length === 0) {
      // No DB permissions — only Super Admin has access by default
      return false;
    }

    const reqActionUpper = (action || '').toUpperCase();

    return permissions.some((p: any) => {
      const pMenuId = p.menu_id ?? p.menu?.id;
      if (pMenuId !== menuId) return false;

      const actUpper = (p.action || '').toUpperCase();
      if (actUpper === 'ALL' || actUpper === '*' || actUpper === 'FULL') return true;
      if (actUpper === reqActionUpper) return true;
      if ((reqActionUpper === 'WRITE' || reqActionUpper === 'CREATE') &&
          (actUpper === 'WRITE' || actUpper === 'CREATE')) return true;

      const reqAction = reqActionUpper.toLowerCase() as PermissionAction;
      const validActions: PermissionAction[] = [
        'canRead', 'canCreate', 'canUpdate', 'canDelete', 'canApprove',
        'canExport', 'canImport', 'canAssign', 'canRevoke', 'canActivate',
        'canDeactivate', 'canRestore', 'canManage', 'canConfigure',
      ];

      if (validActions.includes(reqAction as PermissionAction)) {
        const snake = reqAction.replace(/([A-Z])/g, '_$1').toLowerCase().replace('can_', 'can_');
        if (p[reqAction] === true || p[snake] === true) return true;
      }

      return false;
    });
  }

  /**
   * Coarse-grained UI guard — controls button/form visibility (Add, Edit, Delete, Approve, etc.)
   *
   * Precedence:
   * 1. Super Admin → always true
   * 2. DB permissions matching current path → use DB result
   * 3. No DB permissions → false (strict least-privilege)
   *
   * @param action  The permission action to check
   * @param menuNameOrPath  Explicit path/name; falls back to current router URL
   */
  hasRoleAction(
    action: PermissionAction,
    menuNameOrPath?: string
  ): boolean {
    this.permissionsUpdated();

    if (this.auth.isSuperAdmin()) return true;

    const target = menuNameOrPath || this.router.url.split('?')[0];

    // Check DB permissions first
    if (this.matchesDbPermission(target, action)) return true;

    // Also check DB menus (granted access via menu assignment implies canRead at minimum)
    if (action === 'canRead') {
      const menus = this.session.getMenus();
      if (Array.isArray(menus) && menus.length > 0) {
        const targetNorm = target.toLowerCase().replace(/\/+$/, '');
        const hasMenu = menus.some((m: any) => {
          if (typeof m === 'string') {
            if (m === 'ALL' || m === '*') return true;
            return targetNorm === m.toLowerCase().replace(/\/+$/, '');
          }
          const menuPath = (m.path || m.route || m.menu_path || '').toLowerCase().replace(/\/+$/, '');
          return targetNorm === menuPath || targetNorm.startsWith(menuPath + '/');
        });
        if (hasMenu) return true;
      }
    }

    // No DB permission found → strict deny (no hardcoded fallback for non-Super-Admin)
    return false;
  }

  /**
   * Page-level route access — used by RoleGuard and sidebar filtering.
   *
   * Precedence:
   * 1. Super Admin → always true
   * 2. Universal paths → always true
   * 3. DB-granted permissions → true if any permission exists for path
   * 4. DB-granted menus → true if menu assigned
   * 5. All other cases → false (strict least-privilege)
   */
  hasPagePermission(path: string): boolean {
    this.permissionsUpdated();

    if (this.auth.isSuperAdmin()) return true;

    const targetNorm = (path || '').toLowerCase().replace(/\/+$/, '');

    // Universal paths accessible by all authenticated users
    if (UNIVERSAL_PATHS.some(p => targetNorm === p || targetNorm.startsWith(p + '/'))) {
      return true;
    }

    // Check DB-granted permissions
    if (this.hasAnyDbPermissionForPath(path)) {
      return true;
    }

    // Check DB-granted menus
    const menus = this.session.getMenus();
    if (Array.isArray(menus) && menus.length > 0) {
      const hasMenu = menus.some((m: any) => {
        if (typeof m === 'string') {
          if (m === 'ALL' || m === '*') return true;
          const strNorm = m.toLowerCase().replace(/\/+$/, '');
          return targetNorm === strNorm || targetNorm.startsWith(strNorm + '/');
        }
        const menuPath = (m.path || m.route || m.menu_path || m.name || '').toLowerCase().replace(/\/+$/, '');
        return menuPath && (targetNorm === menuPath || targetNorm.startsWith(menuPath + '/'));
      });
      if (hasMenu) return true;
    }

    // Strict deny — no implicit access for non-Super-Admin
    return false;
  }

  // ─── Domain-Specific RBAC Helpers ──────────────────────────────────────────
  // These domain helpers check DB permissions + Super Admin override.
  // They no longer rely on hardcoded role-name comparisons except for Super Admin.

  canApproveLeave(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canApprove', '/leave');
  }

  canManagePayroll(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canManage', '/payroll') ||
           this.hasRoleAction('canRead', '/payroll');
  }

  canManageWorkforce(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canManage', '/workforce') ||
           this.hasRoleAction('canRead', '/workforce');
  }

  canManageEmployees(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canManage', '/employees') ||
           this.hasRoleAction('canRead', '/employees');
  }

  /**
   * Returns true only for low-privilege roles (Employee/Shopkeeper/Delivery_Boy)
   * that use self-service workflows (e.g. submit own leave request).
   * Super Admin is not an employee in this context.
   */
  isEmployeeSelfService(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return false;
    const userType = this.normalizeUserType(this.auth.getUserType());
    return userType === UserType.EMPLOYEE ||
           userType === UserType.SHOPKEEPER ||
           userType === UserType.DELIVERY_BOY;
  }

  /**
   * Returns true only for Super Admin and users with DB permission to view purchase cost.
   * Gates purchase-cost / margin fields in product forms and reports.
   */
  canViewPurchaseCost(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canRead', '/profit-loss') ||
           this.hasRoleAction('canManage', '/profit-loss');
  }

  /**
   * Returns true for Branch, BranchManager, Employee, Shopkeeper, Delivery_Boy.
   * Used to determine whether a product submission is routed to "Pending Approval".
   */
  isBranchOrBelow(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return false;
    const userType = this.normalizeUserType(this.auth.getUserType());
    return (
      userType === UserType.BRANCH ||
      userType === UserType.BRANCH_MANAGER ||
      userType === UserType.EMPLOYEE ||
      userType === UserType.SHOPKEEPER ||
      userType === UserType.DELIVERY_BOY
    );
  }

  /**
   * Returns true only if the user can manage (approve/reject) products.
   * Requires DB canApprove permission on /product, or Super Admin.
   */
  canApproveProducts(): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canApprove', '/product');
  }

  // ─── Extended Granular Permission Helpers ──────────────────────────────────

  canExport(path?: string): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canExport', path);
  }

  canImport(path?: string): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canImport', path);
  }

  canAssign(path?: string): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canAssign', path);
  }

  canRevoke(path?: string): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canRevoke', path);
  }

  canActivateRecord(path?: string): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canActivate', path);
  }

  canDeactivateRecord(path?: string): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canDeactivate', path);
  }

  canRestoreRecord(path?: string): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canRestore', path);
  }

  canManageConfig(path?: string): boolean {
    this.permissionsUpdated();
    if (this.auth.isSuperAdmin()) return true;
    return this.hasRoleAction('canManage', path) ||
           this.hasRoleAction('canConfigure', path);
  }
}
