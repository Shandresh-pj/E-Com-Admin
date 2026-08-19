import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';


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
export class Leave implements OnInit {

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
  employees:    any[]  = [];
  companies:    any[]  = [];
  branches:     any[]  = [];

  leaveTypes = ['CASUAL', 'SICK', 'EMERGENCY', 'EARNED'];
  leaveForm: FormGroup;
  showForm  = false;
  loading   = false;

  currentUser:      any = null;
  detectedEmployee: any = null;

  /** Leave balance — 100% dynamic from API */
  leaveBalance = { CASUAL: 0, SICK: 0, EARNED: 0, EMERGENCY: 0 };

  /** Cache whether current user can approve (evaluated once, not every CD cycle) */
  canApprove = false;

  constructor(
    private fb           : FormBuilder,
    private commonService: CommonService,
    private alert        : AlertService,
    public  perm         : PermissionService,
    private auth         : AuthService,
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
  }

  // ─── Data Loading ──────────────────────────────────────────────────────

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

  /** Map current logged-in user → employee record and pre-fill form */
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
        if (res?.data) {
          const d = res.data;
          this.leaveBalance = {
            CASUAL:    Number(d.CASUAL    ?? d.casual    ?? 0),
            SICK:      Number(d.SICK      ?? d.sick      ?? 0),
            EARNED:    Number(d.EARNED    ?? d.earned    ?? 0),
            EMERGENCY: Number(d.EMERGENCY ?? d.emergency ?? 0),
          };
          this.cdr.detectChanges();
        }
      },
      error: () => {} // silently ignore — balance is non-critical
    });
  }

  loadLeaveRequests(): void {
    this.commonService.getApi('leave').subscribe({
      next: (res: any) => {
        this.leaveRequests = (res?.data || []).map((item: any) => {
          const empId = Number(item.employee_id);
          const emp   = this.employees.find(e => Number(e.id) === empId);

          // FIX #2: format dates properly — API may return strings or Date objects
          const fromStr = this.safeFormatDate(item.from_date || item.start_date);
          const toStr   = this.safeFormatDate(item.to_date   || item.end_date);

          return {
            ...item,
            employee_name: emp ? emp.name : (item.employee_name || `Employee #${empId}`),
            date_range:    fromStr && toStr ? `${fromStr} → ${toStr}` : (fromStr || toStr || '—'),
            total_days:    item.total_days ?? item.days ?? '—',
            status:        item.status || 'PENDING',
          };
        });
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

  // ─── Date Handling ─────────────────────────────────────────────────────

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

  /** Convert form date (Date object from datepicker) → ISO string for API */
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
    // FIX #7: Single auto-calculate listener — avoid duplicate with (dateChange) in template
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

  // ─── Form Actions ──────────────────────────────────────────────────────

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      // FIX #5: Reset only leave-specific fields; preserve identity fields
      this.leaveForm.patchValue({
        leave_type: 'CASUAL',
        from_date:  null,
        to_date:    null,
        total_days: 1,
        reason:     '',
      });
      this.leaveForm.markAsPristine();
      this.leaveForm.markAsUntouched();
    }
  }

  submitLeaveRequest(): void {
    // FIX #4: Do NOT call detectEmployeeMapping() here — it overrides user's intent
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

    // FIX #2: Convert Date objects from datepicker to ISO strings for API
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

    this.commonService.postApi('leave/apply', payload).subscribe({
      next: () => {
        this.loading = false;   // FIX #3: reset loading on success
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

  // ─── Approve / Reject ──────────────────────────────────────────────────

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

  // ─── View Details ──────────────────────────────────────────────────────

  viewLeave(row: any): void {
    // FIX #8: Use structured content instead of \n — alert services typically render HTML
    const details = [
      `<b>Employee:</b> ${row.employee_name || '—'}`,
      `<b>Leave Type:</b> ${row.leave_type || '—'}`,
      `<b>Duration:</b> ${row.date_range || '—'} (${row.total_days || '—'} day(s))`,
      `<b>Reason:</b> ${row.reason || '—'}`,
      `<b>Status:</b> ${row.status || '—'}`,
    ].join('<br>');
    this.alert.info(details, 'Leave Application Details');
  }

  // ─── Utility ──────────────────────────────────────────────────────────

  /** Used in template for min-date on To Date picker */
  get minToDate(): Date | null {
    const from = this.leaveForm.get('from_date')?.value;
    return from ? new Date(from) : null;
  }

  /** Today's date for min date on From Date picker */
  readonly today = new Date();
}
