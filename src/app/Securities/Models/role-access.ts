export enum UserType {
  SUPER_ADMIN    = 'Super_Admin',
  ADMIN          = 'Admin',
  BRANCH         = 'Branch',
  EMPLOYEE       = 'Employee',
  BRANCH_MANAGER = 'Branch_Manager',
  SHOPKEEPER     = 'Shopkeeper',
  DELIVERY_BOY   = 'Delivery_Boy',
  CUSTOMER       = 'Customer',
}

/**
 * Granular permission actions supported by the RBAC system.
 * These keys are used throughout PermissionService, templates (@if perm.hasRoleAction(...))
 * and DB_ACTION_MAP in permissions.service.ts.
 */
export type PermissionAction =
  | 'canCreate'
  | 'canRead'
  | 'canUpdate'
  | 'canDelete'
  | 'canApprove'
  | 'canExport'
  | 'canImport'
  | 'canAssign'
  | 'canRevoke'
  | 'canActivate'
  | 'canDeactivate'
  | 'canRestore'
  | 'canManage'
  | 'canConfigure';

export interface RolePermissions {
  canCreate:     boolean;
  canRead:       boolean;
  canUpdate:     boolean;
  canDelete:     boolean;
  canApprove:    boolean;
  canExport:     boolean;
  canImport:     boolean;
  canAssign:     boolean;
  canRevoke:     boolean;
  canActivate:   boolean;
  canDeactivate: boolean;
  canRestore:    boolean;
  canManage:     boolean;
  canConfigure:  boolean;
}

/**
 * Static fallback permission matrix.
 *
 * IMPORTANT: This is a LAST-RESORT fallback only.
 * - Super Admin: full access to everything (no DB lookup needed).
 * - All other roles: ALL false — access must come from DB-assigned permissions.
 *
 * This enforces the "only explicitly assigned permissions" rule:
 * a role receives no access by default; Super Admin grants it via Role Access.
 */
export const ROLE_PERMISSIONS: Record<UserType, RolePermissions> = {
  [UserType.SUPER_ADMIN]: {
    canCreate: true, canRead: true, canUpdate: true, canDelete: true,
    canApprove: true, canExport: true, canImport: true, canAssign: true,
    canRevoke: true, canActivate: true, canDeactivate: true, canRestore: true,
    canManage: true, canConfigure: true,
  },
  [UserType.ADMIN]: {
    canCreate: false, canRead: false, canUpdate: false, canDelete: false,
    canApprove: false, canExport: false, canImport: false, canAssign: false,
    canRevoke: false, canActivate: false, canDeactivate: false, canRestore: false,
    canManage: false, canConfigure: false,
  },
  [UserType.BRANCH]: {
    canCreate: false, canRead: false, canUpdate: false, canDelete: false,
    canApprove: false, canExport: false, canImport: false, canAssign: false,
    canRevoke: false, canActivate: false, canDeactivate: false, canRestore: false,
    canManage: false, canConfigure: false,
  },
  [UserType.BRANCH_MANAGER]: {
    canCreate: false, canRead: false, canUpdate: false, canDelete: false,
    canApprove: false, canExport: false, canImport: false, canAssign: false,
    canRevoke: false, canActivate: false, canDeactivate: false, canRestore: false,
    canManage: false, canConfigure: false,
  },
  [UserType.EMPLOYEE]: {
    canCreate: false, canRead: false, canUpdate: false, canDelete: false,
    canApprove: false, canExport: false, canImport: false, canAssign: false,
    canRevoke: false, canActivate: false, canDeactivate: false, canRestore: false,
    canManage: false, canConfigure: false,
  },
  [UserType.SHOPKEEPER]: {
    canCreate: false, canRead: false, canUpdate: false, canDelete: false,
    canApprove: false, canExport: false, canImport: false, canAssign: false,
    canRevoke: false, canActivate: false, canDeactivate: false, canRestore: false,
    canManage: false, canConfigure: false,
  },
  [UserType.DELIVERY_BOY]: {
    canCreate: false, canRead: false, canUpdate: false, canDelete: false,
    canApprove: false, canExport: false, canImport: false, canAssign: false,
    canRevoke: false, canActivate: false, canDeactivate: false, canRestore: false,
    canManage: false, canConfigure: false,
  },
  [UserType.CUSTOMER]: {
    canCreate: false, canRead: false, canUpdate: false, canDelete: false,
    canApprove: false, canExport: false, canImport: false, canAssign: false,
    canRevoke: false, canActivate: false, canDeactivate: false, canRestore: false,
    canManage: false, canConfigure: false,
  },
};
