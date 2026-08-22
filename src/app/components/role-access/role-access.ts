import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { of, concat } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';

import { ALL_APP_ROUTES_37 } from 'src/app/Securities/Models/menus';

import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';

type AccessLevel = 'global' | 'admin' | 'branch' | 'employee';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-role-access',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatIconModule,
    TablerIconsModule,
    RouterModule
  ],
  templateUrl: './role-access.html',
  styleUrl: './role-access.scss',
})
export class RoleAccess implements OnInit {

  // readonly actions = [
  //   'READ', 'WRITE', 'UPDATE', 'DELETE', 'APPROVE',
  //   'EXPORT', 'IMPORT', 'ASSIGN', 'REVOKE',
  //   'ACTIVATE', 'DEACTIVATE', 'RESTORE', 'MANAGE', 'CONFIGURE'
  // ];
  readonly actions = [
    'READ', 'WRITE', 'UPDATE', 'DELETE', 'APPROVE'
  ];

  /**
   * Subset of actions the backend PostgreSQL enum `permissions_action_enum` supports.
   * EXPORT, IMPORT, ASSIGN, REVOKE, ACTIVATE, DEACTIVATE, RESTORE, MANAGE, CONFIGURE
   * are displayed in the UI matrix but MUST be mapped to supported values before
   * sending to the API, otherwise Postgres throws:
   * "invalid input value for enum permissions_action_enum"
   *
   * Supported by backend: READ, WRITE, CREATE, UPDATE, DELETE, APPROVE
   */
  private readonly VALID_DB_ACTIONS = new Set([
    'READ', 'WRITE', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'
  ]);

  /**
   * Maps extended UI actions to the closest supported DB enum action.
   * This allows the UI to show granular actions while the DB stores
   * only the subset it supports.
   */
  private mapActionToDb(action: string): string {
    const map: Record<string, string> = {
      EXPORT:     'READ',
      IMPORT:     'WRITE',
      ASSIGN:     'UPDATE',
      REVOKE:     'UPDATE',
      ACTIVATE:   'UPDATE',
      DEACTIVATE: 'UPDATE',
      RESTORE:    'UPDATE',
      MANAGE:     'UPDATE',
      CONFIGURE:  'UPDATE',
    };
    return map[action] ?? action;
  }

  readonly levels: { value: AccessLevel; label: string; hint: string }[] = [
    { value: 'global', label: 'Role (Global)', hint: 'Applies to the role everywhere' },
    { value: 'admin', label: 'Admin', hint: 'Applies to one admin company' },
    { value: 'branch', label: 'Branch', hint: 'Applies to one branch' },
    { value: 'employee', label: 'Employee', hint: 'Applies to one employee only' },
  ];

  roles: any[] = [];
  menus: any[] = ALL_APP_ROUTES_37;
  companies: any[] = [];
  allBranches: any[] = [];

  selectedLevel: AccessLevel | null = 'global';
  selectedCompanyId: number | null = null;
  selectedBranchId: number | null = null;
  selectedUserId: number | null = null;
  selectedRoleId: number | null = null;

  /** permission_id → role_permission record id  (used for DELETE) */
  assignedMap = new Map<number, number>();

  /** Local working set of assigned permission_ids (used for batch changes) */
  workingAssignments = new Set<number>();

  searchQuery: string = '';
  selectedStatusFilter: 'ALL' | 'GRANTED' | 'DENIED' | 'NA' = 'ALL';
  selectedCategoryFilter: string = 'ALL';

  readonly categoryTabs = [
    { key: 'ALL', label: 'All Modules', icon: 'layout-grid' },
    { key: 'ADMIN', label: 'Admin', icon: 'shield' },
    { key: 'BRANCH', label: 'Branch Control', icon: 'building-store' },
    { key: 'EMPLOYEE', label: 'Employee Access', icon: 'users' },
    { key: 'MOBILITY', label: 'Car Rental & Mobility', icon: 'car' },
    { key: 'CATALOG', label: 'Catalog & Products', icon: 'box' },
    { key: 'FINANCE', label: 'Sales & Finance', icon: 'receipt' },
  ];

  setCategoryFilter(catKey: string): void {
    this.selectedCategoryFilter = catKey;
  }

  getModuleCategory(menu: any): string {
    const path = (menu?.path || '').toLowerCase();
    const cat = (menu?.category || '').toLowerCase();

    if (cat === 'admin' || ['/admin', '/roles', '/role-access', '/audit-logs', '/crm-contacts', '/menubar'].some(p => path === p)) return 'ADMIN';
    if (['/branch', '/branch-stocks'].some(p => path === p)) return 'BRANCH';
    if (cat === 'workforce' || ['/employees', '/workforce', '/shifts', '/break-policies', '/biometric', '/geofencing', '/calendar', '/employee-documents', '/workforce-requests', '/attendance', '/leave', '/payroll'].some(p => path === p)) return 'EMPLOYEE';
    if (['/car-rental', '/mobility-dashboard', '/ride-booking', '/parcel-logistics', '/fleet-management', '/corporate-transport', '/live-tracking', '/vehicle-driver-verification'].some(p => path === p)) return 'MOBILITY';
    if (cat === 'catalog' || ['/product', '/category', '/product-attribute', '/attribute-value', '/coupons'].some(p => path === p)) return 'CATALOG';
    if (cat === 'finance' || cat === 'sales' || ['/orders', '/invoices', '/payments', '/profit-loss', '/billing-history', '/subscription-plans', '/manage-subscription-plans', '/subscription-coupons', '/checkout', '/pos-billing', '/devices'].some(p => path === p)) return 'FINANCE';

    return 'OTHER';
  }

  getCategoryCount(catKey: string): number {
    if (catKey === 'ALL') return this.menus.length;
    return this.menus.filter(m => this.getModuleCategory(m) === catKey).length;
  }

  setStatusFilter(filter: 'ALL' | 'GRANTED' | 'DENIED' | 'NA'): void {
    this.selectedStatusFilter = filter;
  }

  isAnyAssignedForMenu(menu: any): boolean {
    const perms = this.actions.map(a => this.getPermission(menu, a)).filter(p => !!p);
    return perms.some(p => this.workingAssignments.has(p.id));
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatusFilter = 'ALL';
    this.selectedCategoryFilter = 'ALL';
  }

  get filteredMenus(): any[] {
    const q = (this.searchQuery || '').trim().toLowerCase();

    return this.menus.filter(m => {
      // 1. Search Query Filter
      if (q) {
        const matchesName = (m.name || '').toLowerCase().includes(q);
        const matchesPath = (m.path || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPath) return false;
      }

      // 2. Status Pill Filter
      if (this.selectedStatusFilter === 'GRANTED') {
        if (!this.isAnyAssignedForMenu(m)) return false;
      }
      if (this.selectedStatusFilter === 'DENIED') {
        if (this.isAnyAssignedForMenu(m)) return false;
      }

      // 3. Category Filter
      if (this.selectedCategoryFilter !== 'ALL') {
        if (this.getModuleCategory(m) !== this.selectedCategoryFilter) return false;
      }

      return true;
    });
  }

  get totalPermissionsCount(): number {
    let count = 0;
    this.menus.forEach(m => {
      this.actions.forEach(a => {
        if (this.getPermission(m, a)) count++;
      });
    });
    return count;
  }

  get grantedPermissionsCount(): number {
    return this.workingAssignments.size;
  }

  get grantedPercentage(): number {
    const total = this.totalPermissionsCount;
    if (total === 0) return 0;
    return Math.round((this.grantedPermissionsCount / total) * 100);
  }

  grantAllSystemPermissions(): void {
    this.menus.forEach(menu => {
      this.actions.forEach(action => {
        const perm = this.getPermission(menu, action);
        if (perm) {
          this.workingAssignments.add(perm.id);
        }
      });
    });
  }

  revokeAllSystemPermissions(): void {
    this.workingAssignments.clear();
  }

  pending = new Set<number>();

  loading = false;
  matrixLoading = false;

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    public auth: AuthService,
    private permissionService: PermissionService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.loadRoles();
    this.loadMenus();
    this.loadCompanies();
    this.loadBranches();
  }

  seedingMenus = false;

  // ────────────────────────────── lookups ──────────────────────────────

  loadRoles(): void {
    this.commonService.getApi('roles').subscribe({
      next: (res: any) => {
        const fetched: any[] = res?.data ?? [];

        // Core system roles that must always exist in the RBAC control matrix
        const systemRoles = [
          { id: 1, name: 'Super Admin', status: 'Active' },
          { id: 2, name: 'Admin', status: 'Active' },
          { id: 3, name: 'Branch Manager', status: 'Active' },
          { id: 4, name: 'Employee', status: 'Active' },
          { id: 5, name: 'Shopkeeper', status: 'Active' },
          { id: 6, name: 'Delivery Boy', status: 'Active' },
          { id: 7, name: 'Customer', status: 'Active' },
        ];

        const roleMap = new Map<string, any>();
        // 1. Seed standard system roles first
        systemRoles.forEach(r => {
          roleMap.set(r.name.toLowerCase().replace(/_/g, ' '), r);
        });

        // 2. Merge API backend roles
        fetched.forEach((r: any) => {
          const rawName = String(r.name || '').trim();
          const normName = rawName.toLowerCase().replace(/_/g, ' ');
          if (normName) {
            roleMap.set(normName, {
              ...r,
              name: rawName.replace(/_/g, ' ')
            });
          }
        });

        this.roles = Array.from(roleMap.values());

        if (!this.selectedLevel) {
          this.selectedLevel = 'global';
        }
        if (this.roles.length > 0 && !this.selectedRoleId) {
          const adminRole = this.roles.find(r => r.name.toLowerCase().includes('admin')) || this.roles[0];
          this.selectedRoleId = adminRole.id;
        }
        this.tryLoadMatrix();
        this.cdr.detectChanges();
      },
      error: () => {
        this.roles = [
          { id: 1, name: 'Super Admin', status: 'Active' },
          { id: 2, name: 'Admin', status: 'Active' },
          { id: 3, name: 'Branch Manager', status: 'Active' },
          { id: 4, name: 'Employee', status: 'Active' },
          { id: 5, name: 'Shopkeeper', status: 'Active' },
          { id: 6, name: 'Delivery Boy', status: 'Active' },
          { id: 7, name: 'Customer', status: 'Active' },
        ];
        if (!this.selectedRoleId) {
          this.selectedRoleId = 2; // Admin
        }
        this.tryLoadMatrix();
        this.cdr.detectChanges();
      }
    });
  }

  loadMenus(): void {
    this.loading = true;
    this.commonService.getApi('menus').subscribe({
      next: (res: any) => {
        const fetched: any[] = res?.data ?? [];
        const existingPaths = new Set(fetched.map((m: any) => (m.path || m.name || '').toLowerCase()));
        const missing = ALL_APP_ROUTES_37.filter(r => !existingPaths.has(r.path.toLowerCase()) && !existingPaths.has(r.name.toLowerCase()));

        const combined = [...fetched, ...missing];
        const usedMenuIds = new Set<number>();

        // Guarantee 100% unique menu IDs and non-shared permissions array references
        this.menus = combined.map((m, idx) => {
          let uniqueMenuId = m.id;
          if (!uniqueMenuId || uniqueMenuId > 90000 || usedMenuIds.has(uniqueMenuId)) {
            uniqueMenuId = 100 + idx;
            while (usedMenuIds.has(uniqueMenuId)) {
              uniqueMenuId++;
            }
          }
          usedMenuIds.add(uniqueMenuId);

          const rawPerms = Array.isArray(m.permissions) ? m.permissions.map((p: any) => ({ ...p })) : [];
          return {
            ...m,
            id: uniqueMenuId,
            permissions: rawPerms
          };
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        const usedMenuIds = new Set<number>();
        this.menus = ALL_APP_ROUTES_37.map((m, idx) => {
          let uniqueMenuId = m.id || (idx + 1);
          if (usedMenuIds.has(uniqueMenuId)) {
            uniqueMenuId = (idx + 1) * 100;
          }
          usedMenuIds.add(uniqueMenuId);
          return { ...m, id: uniqueMenuId, permissions: [] };
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadCompanies(): void {
    this.commonService.getApi('companies').subscribe({
      next: (res: any) => { this.companies = res?.data ?? []; this.cdr.detectChanges(); },
    });
  }

  loadBranches(): void {
    this.commonService.getApi('branches').subscribe({
      next: (res: any) => { this.allBranches = res?.data ?? []; this.cdr.detectChanges(); },
    });
  }

  // ─────────────────────────── derived lists ───────────────────────────

  get companyBranches(): any[] {
    if (!this.selectedCompanyId) return [];
    return this.allBranches.filter(b => b.company?.id === this.selectedCompanyId);
  }

  /** Users assigned to the selected branch (deduped, from branch.userRoles) */
  get branchUsers(): any[] {
    const branch = this.allBranches.find(b => b.id === this.selectedBranchId);
    if (!branch?.userRoles) return [];
    const seen = new Map<number, any>();
    for (const ur of branch.userRoles) {
      if (ur.user && !seen.has(ur.user.id)) {
        seen.set(ur.user.id, { user: ur.user, role: ur.role });
      }
    }
    return Array.from(seen.values());
  }

  get needsCompany(): boolean {
    return this.selectedLevel === 'admin' || this.selectedLevel === 'branch' || this.selectedLevel === 'employee';
  }

  get needsBranch(): boolean {
    return this.selectedLevel === 'branch' || this.selectedLevel === 'employee';
  }

  get needsEmployee(): boolean {
    return this.selectedLevel === 'employee';
  }

  /** Role is picked automatically from the employee's assignment */
  get roleLocked(): boolean {
    return this.selectedLevel === 'employee';
  }

  get scopeReady(): boolean {
    if (!this.selectedLevel || !this.selectedRoleId) return false;
    if (this.needsCompany && !this.selectedCompanyId) return false;
    if (this.needsBranch && !this.selectedBranchId) return false;
    if (this.needsEmployee && !this.selectedUserId) return false;
    return true;
  }

  get scopeSummary(): string {
    const parts: string[] = [];
    const role = this.roles.find(r => r.id === this.selectedRoleId)?.name;
    const company = this.companies.find(c => c.id === this.selectedCompanyId)?.name;
    const branch = this.companyBranches.find(b => b.id === this.selectedBranchId)?.name;
    const user = this.branchUsers.find(u => u.user.id === this.selectedUserId)?.user?.name;
    if (role) parts.push(`Role: ${role}`);
    if (this.needsCompany && company) parts.push(`Admin: ${company}`);
    if (this.needsBranch && branch) parts.push(`Branch: ${branch}`);
    if (this.needsEmployee && user) parts.push(`Employee: ${user}`);
    return parts.join('  ·  ');
  }

  // ──────────────────────── cascading selection ────────────────────────

  onLevelChange(): void {
    this.selectedCompanyId = null;
    this.selectedBranchId = null;
    this.selectedUserId = null;
    if (this.selectedLevel === 'global' && this.roles.length > 0) {
      this.selectedRoleId = this.roles[0].id;
    } else {
      this.selectedRoleId = null;
    }
    this.clearMatrix();
    this.tryLoadMatrix();
  }

  onCompanyChange(): void {
    this.selectedBranchId = null;
    this.selectedUserId = null;
    this.clearMatrix();

    // spec: when the admin has only one branch, select it automatically
    if (this.needsBranch && this.companyBranches.length === 1) {
      this.selectedBranchId = this.companyBranches[0].id;
    }
    this.tryLoadMatrix();
  }

  onBranchChange(): void {
    this.selectedUserId = null;
    this.clearMatrix();
    this.tryLoadMatrix();
  }

  onEmployeeChange(): void {
    // the grant is stored against the employee's own role
    const entry = this.branchUsers.find(u => u.user.id === this.selectedUserId);
    this.selectedRoleId = entry?.role?.id ?? null;
    this.clearMatrix();
    this.tryLoadMatrix();
  }

  onRoleChange(): void {
    this.clearMatrix();
    this.tryLoadMatrix();
  }

  private clearMatrix(): void {
    this.assignedMap.clear();
    this.workingAssignments.clear();
    this.pending.clear();
  }

  // ───────────────────────────── matrix I/O ────────────────────────────

  private scopePayload(): any {
    const payload: any = {};
    if (this.needsCompany) payload.company_id = this.selectedCompanyId;
    if (this.needsBranch) payload.branch_id = this.selectedBranchId;
    if (this.needsEmployee) payload.user_id = this.selectedUserId;
    return payload;
  }

  tryLoadMatrix(): void {
    if (!this.scopeReady) return;

    this.matrixLoading = true;

    const selectedRoleObj = this.roles.find(r => r.id === this.selectedRoleId);
    const roleName = String(selectedRoleObj?.name || '').toLowerCase().replace(/_/g, ' ');
    const isSuperAdminRole = roleName.includes('super admin') || roleName === 'super_admin' || roleName === 'superadmin';

    const params: any = { level: this.selectedLevel };
    if (this.needsEmployee) {
      // employee rows are matched by user, whatever the role
      params.user_id = this.selectedUserId;
    } else {
      params.role_id = this.selectedRoleId;
      if (this.needsCompany) params.company_id = this.selectedCompanyId;
      if (this.needsBranch) params.branch_id = this.selectedBranchId;
    }

    this.commonService.getApi('role-access', params).subscribe({
      next: (res: any) => {
        const assignments: any[] = res?.data ?? [];
        this.assignedMap.clear();

        assignments.forEach(a => {
          const dbPermId = a.permission_id;
          const recordId = a.id;

          // 1. Direct DB permission_id mapping
          if (dbPermId) {
            this.assignedMap.set(dbPermId, recordId);
          }

          // 2. Cross-match menu & action to local synthesized menu permissions
          if (a.permission) {
            const menuRef = a.permission.menu;
            const action = a.permission.action;
            if (action && menuRef) {
              const matchedMenu = this.menus.find(m =>
                (menuRef.id && m.id === menuRef.id) ||
                (menuRef.path && m.path?.toLowerCase() === menuRef.path.toLowerCase()) ||
                (menuRef.name && m.name?.toLowerCase() === menuRef.name.toLowerCase())
              );

              if (matchedMenu) {
                const localPerm = this.getPermission(matchedMenu, action);
                if (localPerm) {
                  this.assignedMap.set(localPerm.id, recordId);
                }
              }
            }
          }
        });

        // For Super Admin role: if no explicit DB overrides exist yet, grant ALL system permissions (100% Granted)
        if (isSuperAdminRole && this.assignedMap.size === 0) {
          this.grantAllSystemPermissions();
          this.workingAssignments.forEach(id => this.assignedMap.set(id, id));
        } else {
          this.workingAssignments = new Set(this.assignedMap.keys());
        }

        this.matrixLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.matrixLoading = false;
        if (isSuperAdminRole) {
          this.grantAllSystemPermissions();
          this.workingAssignments.forEach(id => this.assignedMap.set(id, id));
        }
        this.cdr.detectChanges();
      },
    });
  }

  /** Returns the permission object for a given menu + action (isolated per menu module) */
  getPermission(menu: any, action: string): any {
    if (!menu || !menu.id) return null;
    if (!menu.permissions) {
      menu.permissions = [];
    }

    let perm = menu.permissions.find((p: any) => p.action === action);
    if (!perm) {
      const actionMap: Record<string, number> = { READ: 1, WRITE: 2, UPDATE: 3, DELETE: 4, APPROVE: 5 };
      const actionId = actionMap[action] || 9;
      // Synthesize unique permission ID strictly namespaced to menu.id
      const permId = Number(`${menu.id}${actionId}`);
      perm = { id: permId, menu_id: menu.id, action: action, synthesized: true };
      menu.permissions.push(perm);
    }
    return perm;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  isWorkingAssigned(menu: any, action: string): boolean {
    const perm = this.getPermission(menu, action);
    return perm ? this.workingAssignments.has(perm.id) : false;
  }

  get hasChanges(): boolean {
    if (this.workingAssignments.size !== this.assignedMap.size) return true;
    for (const key of this.workingAssignments) {
      if (!this.assignedMap.has(key)) return true;
    }
    return false;
  }

  get unsavedChangesCount(): number {
    let diff = 0;
    for (const key of this.workingAssignments) {
      if (!this.assignedMap.has(key)) diff++;
    }
    for (const key of this.assignedMap.keys()) {
      if (!this.workingAssignments.has(key)) diff++;
    }
    return diff;
  }

  toggle(menu: any, action: string): void {
    const perm = this.getPermission(menu, action);
    if (!perm) return;

    if (this.workingAssignments.has(perm.id)) {
      this.workingAssignments.delete(perm.id);
    } else {
      this.workingAssignments.add(perm.id);
    }
  }

  /** Returns true if every available permission for this menu row is assigned */
  isAllAssignedForMenu(menu: any): boolean {
    const perms = this.actions
      .map(a => this.getPermission(menu, a))
      .filter(p => !!p);
    if (perms.length === 0) return false;
    return perms.every(p => this.workingAssignments.has(p.id));
  }

  /** Toggle all available permissions for a menu row on/off */
  toggleAllForMenu(menu: any): void {
    const perms = this.actions
      .map(a => this.getPermission(menu, a))
      .filter(p => !!p);
    const allOn = this.isAllAssignedForMenu(menu);
    if (allOn) {
      perms.forEach(p => this.workingAssignments.delete(p.id));
    } else {
      perms.forEach(p => this.workingAssignments.add(p.id));
    }
  }

  cancelChanges(): void {
    this.workingAssignments = new Set(this.assignedMap.keys());
  }

  private findPermissionDetails(permId: number): { menu: any; action: string } | null {
    for (const menu of this.menus) {
      if (menu.permissions && Array.isArray(menu.permissions)) {
        for (const p of menu.permissions) {
          if (p && p.id === permId) {
            return { menu, action: p.action };
          }
        }
      }
    }
    return null;
  }

  saveChanges(): void {
    if (!this.scopeReady) return;

    this.matrixLoading = true;

    const grants: any[] = [];
    // Track (menu_path + dbAction) pairs already added to avoid duplicate constraint errors
    const grantedKeys = new Set<string>();

    for (const permId of this.workingAssignments) {
      if (this.assignedMap.has(permId)) continue; // already exists, no change needed

      const details = this.findPermissionDetails(permId);
      if (!details) continue;

      // Map extended UI action to the closest DB-supported enum value
      const dbAction = this.mapActionToDb(details.action);
      const dedupeKey = `${details.menu.path}::${dbAction}`;

      // Skip if we already have a grant for this (menu + dbAction) pair
      if (grantedKeys.has(dedupeKey)) continue;
      grantedKeys.add(dedupeKey);

      grants.push({
        permission_id: permId,
        menu_id: details.menu.id,
        menu_name: details.menu.name,
        menu_path: details.menu.path,
        // Send the mapped DB-safe action, not the raw UI action
        action: dbAction,
        // Preserve boolean flags for backward compatibility
        canRead:   dbAction === 'READ',
        canCreate: dbAction === 'WRITE' || dbAction === 'CREATE',
        canUpdate: dbAction === 'UPDATE',
        canDelete: dbAction === 'DELETE',
        canApprove: dbAction === 'APPROVE',
      });
    }

    const revokes: number[] = [];
    for (const [permId, recordId] of this.assignedMap.entries()) {
      if (this.workingAssignments.has(permId)) continue; // still checked, keep it
      revokes.push(recordId);
    }

    if (grants.length === 0 && revokes.length === 0) {
      this.matrixLoading = false;
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      role_id: this.selectedRoleId,
      company_id: this.selectedCompanyId,
      branch_id: this.selectedBranchId,
      user_id: this.selectedUserId,
      grants,
      revokes,
    };

    this.commonService.postApi('role-access', payload).subscribe({
      next: (res: any) => {
        this.matrixLoading = false;
        this.cdr.detectChanges();
        this.alert.success(res?.message || 'Permissions updated successfully');
        this.permissionService.permissionsUpdated.set(Date.now());
        this.tryLoadMatrix();
      },
      error: (err: any) => {
        this.matrixLoading = false;
        this.cdr.detectChanges();
        this.alert.error(err?.error?.message ?? 'Failed to save changes');
        this.tryLoadMatrix();
      }
    });
  }
}
