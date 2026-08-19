import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Custom validator: to_date must be >= from_date
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('from_date')?.value;
  const to   = group.get('to_date')?.value;
  if (from && to) {
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      if (toDate < fromDate) {
        return { dateRangeInvalid: true };
      }
    }
  }
  return null;
}

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    MatTable,
  ],
  providers: [DatePipe],
  templateUrl: './leave.html',
  styleUrl: './leave.scss',
})
export class Leave implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tableColumns: TableColumn[] = [
    { columnDef: 'id',            header: 'No'             },
    { columnDef: 'employee_name', header: 'Employee'       },
    { columnDef: 'date_range',    header: 'Leave Duration' },
    { columnDef: 'total_days',    header: 'Days'           },
    { columnDef: 'leave_type',    header: 'Leave Type'     },
    { columnDef: 'reason',        header: 'Reason'         },
    { columnDef: 'status',        header: 'Status', type: 'badge' }
  ];

  leaveRequests: any[] = [];
  // Stat Chip Computed Properties
  get pendingLeavesCount():  number { return this.leaveRequests.filter((l: any) => (l.status || "").toLowerCase() === "pending").length; }
  get approvedLeavesCount(): number { return this.leaveRequests.filter((l: any) => (l.status || "").toLowerCase() === "approved").length; }
  get rejectedLeavesCount(): number { return this.leaveRequests.filter((l: any) => (l.status || "").toLowerCase() === "rejected").length; }
  employees:    any[]  = [];
  companies:    any[]  = [];
  branches:     any[]  = [];

  leaveTypes = ['CASUAL', 'SICK', 'EMERGENCY', 'EARNED'];
  leaveForm: FormGroup;
  showForm  = false;
  loading   = false;
  isEditMode = false;
  editingLeaveId: number | null = null;

  currentUser:      any = null;
  detectedEmployee: any = null;

  /** Leave balance â€” 100% dynamic from API */
  leaveBalance = { CASUAL: 0, SICK: 0, EARNED: 0, EMERGENCY: 0 };

  /** Cache whether current user can approve (evaluated once, not every CD cycle) */
  canApprove = false;

  constructor(
    private fb           : FormBuilder,
    private commonService: CommonService,
    private alert        : AlertService,
    public  perm         : PermissionService,
    private auth         : AuthService,
    private socketService: SocketService,
    private cdr          : ChangeDetectorRef,
    private datePipe     : DatePipe
  ) {
    this.leaveForm = this.fb.group({
      employee_id: [null, Validators.required],
      company_id:  [null, Validators.required],
      branch_id:   [null, Validators.required],
      leave_type:  ['CASUAL', Validators.required],
      from_date:   [null, Validators.required],
      to_date:     [null, Validators.required],
      total_days:  [1, [Validators.required, Validators.min(1)]],
      reason:      ['', [Validators.required, Validators.minLength(10)]]
    }, { validators: dateRangeValidator });
  }

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();
    this.canApprove  = this.perm.canApproveLeave();   // cache once
    this.loadLookups();
    this.setupDateListeners();

    // ── Real-time leave status updates ─────────────────────────────────
    // When an admin approves or rejects a leave, the backend emits
    // 'leave.status.changed' via Socket.IO. We subscribe here and
    // refresh the list immediately — no manual page reload needed.
    this.socketService.on<any>('leave.status.changed')
      .pipe(takeUntil(this.destroy$))
      .subscribe((payload) => {
        // Update the specific leave record in-place if it exists
        const idx = this.leaveRequests.findIndex(l => Number(l.id) === Number(payload?.leaveId));
        if (idx > -1) {
          this.leaveRequests[idx] = { ...this.leaveRequests[idx], status: payload.status };
          this.leaveRequests = [...this.leaveRequests]; // trigger change detection
        } else {
          // Unknown leave ID — reload the full list
          this.loadLeaveRequests();
        }
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isAdminUser(): boolean {
    return this.auth.isAdmin();
  }

  // --- Data Loading ---

  loadLookups(): void {
    this.loading = true;

    this.commonService.getApi('companies').subscribe({
      next: (res: any) => { this.companies = res?.data || []; }
    });

    this.commonService.getApi('branches').subscribe({
      next: (res: any) => { this.branches = res?.data || []; }
    });

    this.commonService.getApi('employees').subscribe({
      next: (res: any) => {
        this.employees = res?.data || [];
        this.detectEmployeeMapping();   // run once after employees load
        this.loadLeaveRequests();
      },
      error: () => { this.loading = false; }
    });
  }

  /** Map current logged-in user -> employee record and pre-fill form */
  detectEmployeeMapping(): void {
    if (!this.currentUser) {
      this.patchFormIdentity(null, 1, 1);
      return;
    }

    const mapped = (this.employees || []).find(
      e => e.email?.toLowerCase() === this.currentUser.email?.toLowerCase() ||
           e.id === this.currentUser.userId ||
           e.id === this.currentUser.id     ||
           e.id === this.currentUser.user_id
    ) ?? (this.employees.length > 0 ? this.employees[0] : null);

    if (mapped) {
      this.detectedEmployee = mapped;
      this.patchFormIdentity(
        mapped.id,
        mapped.company_id || mapped.companyId || 1,
        mapped.branch_id  || mapped.branchId  || 1
      );
      this.loadLeaveBalance(Number(mapped.id));
    } else {
      this.patchFormIdentity(null, 1, 1);
      this.loadLeaveBalance(1);
    }

    // Role-based control for Employee select field:
    // If Admin / Super Admin -> enable select field so admin can pick any employee
    // If Employee / Non-admin -> default to logged in employee & disable field
    if (this.isAdminUser) {
      this.leaveForm.get('employee_id')?.enable();
    } else {
      this.leaveForm.get('employee_id')?.disable();
    }
  }

  onEmployeeChange(empId: any): void {
    const selected = (this.employees || []).find(e => Number(e.id) === Number(empId));
    if (selected) {
      this.patchFormIdentity(
        selected.id,
        selected.company_id || selected.companyId || 1,
        selected.branch_id  || selected.branchId  || 1
      );
      this.loadLeaveBalance(Number(selected.id));
    }
  }

  private patchFormIdentity(employeeId: any, companyId: any, branchId: any): void {
    this.leaveForm.patchValue({
      employee_id: employeeId ? Number(employeeId) : null,
      company_id:  Number(companyId),
      branch_id:   Number(branchId),
    }, { emitEvent: false });
  }

  loadLeaveBalance(employeeId: number): void {
    this.commonService.getApi(`leave/balance?employee_id=${employeeId}`).subscribe({
      next: (res: any) => {
        const d = res?.data || res;
        if (d && typeof d === 'object' && !Array.isArray(d) && (d.CASUAL !== undefined || d.casual !== undefined || d.casual_leave !== undefined)) {
          this.leaveBalance = {
            CASUAL:    Number(d.CASUAL    ?? d.casual    ?? d.casual_leave    ?? 12),
            SICK:      Number(d.SICK      ?? d.sick      ?? d.sick_leave      ?? 10),
            EARNED:    Number(d.EARNED    ?? d.earned    ?? d.earned_leave    ?? 15),
            EMERGENCY: Number(d.EMERGENCY ?? d.emergency ?? d.emergency_leave ?? 5),
          };
          this.cdr.detectChanges();
        } else if (Array.isArray(d) && d.length > 0) {
          const bal: any = { CASUAL: 12, SICK: 10, EARNED: 15, EMERGENCY: 5 };
          d.forEach((item: any) => {
            const type = String(item.leave_type || item.type || '').toUpperCase().trim();
            const val = Number(item.balance ?? item.remaining_days ?? item.available ?? item.total_days ?? 0);
            if (type && bal.hasOwnProperty(type)) {
              bal[type] = val;
            }
          });
          this.leaveBalance = bal;
          this.cdr.detectChanges();
        } else {
          this.calculateDynamicBalanceFromRequests();
        }
      },
      error: () => {
        this.calculateDynamicBalanceFromRequests();
      }
    });
  }

  calculateDynamicBalanceFromRequests(): void {
    const rawForm = this.leaveForm.getRawValue();
    const targetEmpId = Number(rawForm.employee_id || this.detectedEmployee?.id || 1);

    const approved = this.leaveRequests.filter(l => 
      Number(l.employee_id || l.employeeId) === targetEmpId &&
      String(l.status).toUpperCase() === 'APPROVED'
    );

    let casualUsed = 0;
    let sickUsed = 0;
    let earnedUsed = 0;
    let emergencyUsed = 0;

    approved.forEach(l => {
      const type = String(l.leave_type || l.type || '').toUpperCase().trim();
      const days = Number(l.total_days || l.days || 1);
      if (type.includes('CASUAL')) casualUsed += days;
      else if (type.includes('SICK')) sickUsed += days;
      else if (type.includes('EARNED')) earnedUsed += days;
      else if (type.includes('EMERGENCY')) emergencyUsed += days;
    });

    this.leaveBalance = {
      CASUAL: Math.max(0, 12 - casualUsed),
      SICK: Math.max(0, 10 - sickUsed),
      EARNED: Math.max(0, 15 - earnedUsed),
      EMERGENCY: Math.max(0, 5 - emergencyUsed)
    };
    this.cdr.detectChanges();
  }

  loadLeaveRequests(): void {
    this.commonService.getApi('leave').subscribe({
      next: (res: any) => {
        let rawLogs = res?.data || [];

        // If non-admin employee, filter to show only own leave requests
        if (!this.isAdminUser && this.detectedEmployee?.id) {
          const empId = Number(this.detectedEmployee.id);
          rawLogs = rawLogs.filter((item: any) => Number(item.employee_id || item.employeeId) === empId);
        }

        this.leaveRequests = rawLogs.map((item: any) => {
          const empId = Number(item.employee_id ?? item.employeeId);
          const emp   = this.employees.find(e => Number(e.id) === empId);

          const fromStr = this.safeFormatDate(item.from_date || item.start_date);
          const toStr   = this.safeFormatDate(item.to_date   || item.end_date);

          return {
            ...item,
            employee_name: emp ? emp.name : (item.employee_name || `Employee #${empId}`),
            date_range:    fromStr && toStr ? `${fromStr} -> ${toStr}` : (fromStr || toStr || '—'),
            total_days:    item.total_days ?? item.days ?? '—',
            status:        item.status || 'PENDING',
          };
        });

        this.calculateDynamicBalanceFromRequests();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[Leave] Failed to load leave requests:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // â”€â”€â”€ Date Handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


  /** Safely format any date value to dd-MM-yyyy string */
  private safeFormatDate(value: any): string {
    if (!value) return '';
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return this.datePipe.transform(d, 'dd-MM-yyyy') || String(value);
    } catch {
      return String(value);
    }
  }

  /** Convert form date (Date object from datepicker) â†’ ISO string for API */
  private toIsoDateString(value: any): string {
    if (!value) return '';
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return '';
      return this.datePipe.transform(d, 'yyyy-MM-dd') || '';
    } catch {
      return '';
    }
  }

  setupDateListeners(): void {
    // FIX #7: Single auto-calculate listener â€” avoid duplicate with (dateChange) in template
    const recalcDays = () => {
      const from = this.leaveForm.get('from_date')?.value;
      const to   = this.leaveForm.get('to_date')?.value;
      if (from && to) {
        const fromDate = new Date(from);
        const toDate   = new Date(to);
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && toDate >= fromDate) {
          const diffMs   = toDate.getTime() - fromDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
          this.leaveForm.patchValue({ total_days: diffDays }, { emitEvent: false });
        }
      }
    };

    this.leaveForm.get('from_date')?.valueChanges.subscribe(recalcDays);
    this.leaveForm.get('to_date')?.valueChanges.subscribe(recalcDays);
  }

  // â”€â”€â”€ Form Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      // Reset form and edit mode state
      this.isEditMode = false;
      this.editingLeaveId = null;
      this.leaveForm.patchValue({
        leave_type: 'CASUAL',
        from_date:  null,
        to_date:    null,
        total_days: 1,
        reason:     '',
      });
      this.leaveForm.markAsPristine();
      this.leaveForm.markAsUntouched();
    } else {
      if (this.isAdminUser) {
        this.leaveForm.get('employee_id')?.enable();
      } else {
        this.leaveForm.get('employee_id')?.disable();
      }
    }
  }

  submitLeaveRequest(): void {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();

      // Give user a helpful specific error message
      if (this.leaveForm.hasError('dateRangeInvalid')) {
        this.alert.error('End date cannot be before start date.');
        return;
      }
      this.alert.error('Please fill all required fields correctly.');
      return;
    }

    this.loading = true;

    const raw = this.leaveForm.getRawValue();
    const payload = {
      employee_id: Number(raw.employee_id) || 1,
      company_id:  Number(raw.company_id)  || 1,
      branch_id:   Number(raw.branch_id)   || 1,
      leave_type:  raw.leave_type,
      from_date:   this.toIsoDateString(raw.from_date),
      to_date:     this.toIsoDateString(raw.to_date),
      total_days:  Number(raw.total_days)  || 1,
      reason:      (raw.reason || '').trim(),
    };

    // Guard: ensure dates were converted correctly
    if (!payload.from_date || !payload.to_date) {
      this.loading = false;
      this.alert.error('Please select valid leave dates.');
      return;
    }

    if (this.isEditMode && this.editingLeaveId) {
      this.commonService.putApi(`leave/${this.editingLeaveId}`, payload).subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Leave request updated successfully.');
          this.showForm = false;
          this.isEditMode = false;
          this.editingLeaveId = null;
          this.loadLeaveRequests();
        },
        error: (err: any) => {
          this.loading = false;
          const msg = err?.error?.message || err?.message || 'Update failed. Please try again.';
          this.alert.error(msg);
        }
      });
    } else {
      this.commonService.postApi('leave/apply', payload).subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Leave request submitted successfully. Awaiting Manager Approval.');
          this.showForm = false;
          this.loadLeaveRequests();
        },
        error: (err: any) => {
          this.loading = false;
          const msg = err?.error?.message || err?.message || 'Submission failed. Please try again.';
          this.alert.error(msg);
        }
      });
    }
  }

  // â”€â”€â”€ Approve / Reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  approveLeave(row: any): void {
    if (!this.canApprove) {
      this.alert.error('Access Denied: You do not have permission to approve leave requests.');
      return;
    }

    this.alert.confirm(`Approve leave for ${row.employee_name || 'this employee'}? (${row.date_range})`).then(result => {
      if (!result.isConfirmed) return;
      this.loading = true;
      this.commonService.putApi(`leave/approve/${row.id}`, {}).subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Leave approved! Attendance and Payroll will be synced automatically.');
          this.loadLeaveRequests();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Approval failed. Please try again.');
        }
      });
    });
  }

  rejectLeave(row: any): void {
    if (!this.canApprove) {
      this.alert.error('Access Denied: You do not have permission to reject leave requests.');
      return;
    }

    this.alert.confirm(`Reject leave for ${row.employee_name || 'this employee'}?`).then(result => {
      if (!result.isConfirmed) return;
      this.loading = true;
      this.commonService.putApi(`leave/reject/${row.id}`, {}).subscribe({
        next: () => {
          this.loading = false;
          this.alert.success('Leave request rejected.');
          this.loadLeaveRequests();
        },
        error: (err: any) => {
          this.loading = false;
          this.alert.error(err?.error?.message || 'Rejection failed. Please try again.');
        }
      });
    });
  }

  // â”€â”€â”€ View Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  selectedLeaveRecord: any = null;
  viewModalMode: 'VIEW' | 'EDIT' | null = null;

  // --- View & Edit Modal Actions ---

  viewLeave(row: any): void {
    this.selectedLeaveRecord = row;
    this.viewModalMode = 'VIEW';
    this.cdr.detectChanges();
  }

  onEdit(row: any): void {
    if (!this.canApprove) {
      this.alert.error('Access Denied: You do not have permission to edit leave requests.');
      return;
    }
    this.isEditMode = true;
    this.editingLeaveId = Number(row.id);

    const fromDate = (row.from_date || row.start_date) ? new Date(row.from_date || row.start_date) : null;
    const toDate = (row.to_date || row.end_date) ? new Date(row.to_date || row.end_date) : null;

    this.leaveForm.patchValue({
      employee_id: Number(row.employee_id || row.employeeId || 1),
      company_id:  Number(row.company_id  || row.companyId  || 1),
      branch_id:   Number(row.branch_id   || row.branchId   || 1),
      leave_type:  row.leave_type || 'CASUAL',
      from_date:   fromDate,
      to_date:     toDate,
      total_days:  Number(row.total_days || row.days || 1),
      reason:      row.reason || '',
    });

    if (this.isAdminUser) {
      this.leaveForm.get('employee_id')?.enable();
    } else {
      this.leaveForm.get('employee_id')?.disable();
    }

    this.showForm = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.selectedLeaveRecord = null;
    this.viewModalMode = null;
    this.cdr.detectChanges();
  }

  approveLeaveFromModal(): void {
    if (!this.selectedLeaveRecord) return;
    const row = this.selectedLeaveRecord;
    this.closeModal();
    this.approveLeave(row);
  }

  rejectLeaveFromModal(): void {
    if (!this.selectedLeaveRecord) return;
    const row = this.selectedLeaveRecord;
    this.closeModal();
    this.rejectLeave(row);
  }

  // â”€â”€â”€ Utility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Used in template for min-date on To Date picker */
  get minToDate(): Date | null {
    const from = this.leaveForm.get('from_date')?.value;
    return from ? new Date(from) : null;
  }

  /** Today's date for min date on From Date picker */
  readonly today = new Date();
}


