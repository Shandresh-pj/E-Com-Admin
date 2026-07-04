import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { of, concat } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';

type AccessLevel = 'global' | 'admin' | 'branch' | 'employee';

@Component({
  selector: 'app-role-access',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './role-access.html',
  styleUrl: './role-access.scss',
})
export class RoleAccess implements OnInit {

  readonly actions = ['READ', 'WRITE', 'UPDATE', 'DELETE', 'APPROVE'];

  readonly levels: { value: AccessLevel; label: string; hint: string }[] = [
    { value: 'global', label: 'Role (Global)', hint: 'Applies to the role everywhere' },
    { value: 'admin', label: 'Admin', hint: 'Applies to one admin company' },
    { value: 'branch', label: 'Branch', hint: 'Applies to one branch' },
    { value: 'employee', label: 'Employee', hint: 'Applies to one employee only' },
  ];

  roles: any[] = [];
  menus: any[] = [];
  companies: any[] = [];
  allBranches: any[] = [];

  selectedLevel: AccessLevel | null = null;
  selectedCompanyId: number | null = null;
  selectedBranchId: number | null = null;
  selectedUserId: number | null = null;
  selectedRoleId: number | null = null;

  /** permission_id → role_permission record id  (used for DELETE) */
  assignedMap = new Map<number, number>();

  /** Local working set of assigned permission_ids (used for batch changes) */
  workingAssignments = new Set<number>();

  /** permission_ids currently being toggled (debounce + optimistic UI) */
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

  // ────────────────────────────── lookups ──────────────────────────────

  loadRoles(): void {
    this.commonService.getApi('roles').subscribe({
      next: (res: any) => { this.roles = res?.data ?? []; this.cdr.detectChanges(); },
    });
  }

  loadMenus(): void {
    this.loading = true;
    this.commonService.getApi('menus').subscribe({
      next: (res: any) => {
        this.menus = res?.data ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
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
    this.selectedRoleId = null;
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
        assignments.forEach(a => this.assignedMap.set(a.permission_id, a.id));
        this.workingAssignments = new Set(this.assignedMap.keys());
        this.matrixLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.matrixLoading = false;
        this.cdr.detectChanges();
        this.alert.error(err?.error?.message ?? 'Failed to load permissions');
      },
    });
  }

  /** Returns the permission object for a given menu + action */
  getPermission(menu: any, action: string): any {
    return menu.permissions?.find((p: any) => p.action === action);
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

  toggle(menu: any, action: string): void {
    const perm = this.getPermission(menu, action);
    if (!perm) return;

    if (this.workingAssignments.has(perm.id)) {
      this.workingAssignments.delete(perm.id);
    } else {
      this.workingAssignments.add(perm.id);
    }
  }

  cancelChanges(): void {
    this.workingAssignments = new Set(this.assignedMap.keys());
  }

  private findPermissionDetails(permId: number): { menu: any; action: string } | null {
    for (const menu of this.menus) {
      if (menu.permissions) {
        for (const action of this.actions) {
          const p = menu.permissions.find((x: any) => x.action === action);
          if (p && p.id === permId) {
            return { menu, action };
          }
        }
      }
    }
    return null;
  }

  saveChanges(): void {
    if (!this.scopeReady) return;

    this.matrixLoading = true;

    const requests: any[] = [];

    // Grant newly-checked permissions (CREATE only — backend sets status ACTIVE on creation)
    for (const permId of this.workingAssignments) {
      if (this.assignedMap.has(permId)) continue; // already exists, no change needed

      const details = this.findPermissionDetails(permId);
      if (!details) continue;

      const payload = {
        role_id: this.selectedRoleId,
        permission_id: permId,
        company_id: this.selectedCompanyId,
        branch_id: this.selectedBranchId,
        user_id: this.selectedUserId,
        canApprove: details.action === 'APPROVE',
      };

      requests.push(
        this.commonService.postApi('role-access', payload).pipe(
          catchError((err) => of({ error: true, id: permId, message: err?.error?.message }))
        )
      );
    }

    // Revoke unchecked permissions (DELETE)
    for (const [permId, recordId] of this.assignedMap.entries()) {
      if (this.workingAssignments.has(permId)) continue; // still checked, keep it

      requests.push(
        this.commonService.deleteApi(`role-access/${recordId}`).pipe(
          catchError((err) => of({ error: true, id: permId, message: err?.error?.message }))
        )
      );
    }

    if (requests.length === 0) {
      this.matrixLoading = false;
      this.cdr.detectChanges();
      return;
    }

    const results: any[] = [];
    concat(...requests).subscribe({
      next: (res: any) => { results.push(res); },
      complete: () => {
        this.matrixLoading = false;
        this.cdr.detectChanges();
        const failed = results.filter(r => r && r.error);
        if (failed.length > 0) {
          this.alert.error(`Some changes failed: ${failed.map(f => f.message || 'Unknown error').join(', ')}`);
        } else {
          this.alert.success('Permissions updated successfully');
          this.permissionService.permissionsUpdated.set(Date.now());
        }
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
