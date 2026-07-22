import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    MatTable
  ],
  templateUrl: './leave.html',
  styleUrl: './leave.scss',
})
export class Leave implements OnInit {
  tableColumns: TableColumn[] = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'employee_name', header: 'Employee' },
    { columnDef: 'date_range', header: 'Leave Duration' },
    { columnDef: 'total_days', header: 'Days' },
    { columnDef: 'leave_type', header: 'Leave Type' },
    { columnDef: 'reason', header: 'Reason' },
    { columnDef: 'status', header: 'Status', type: 'badge' }
  ];

  leaveRequests: any[] = [];
  employees: any[] = [];
  companies: any[] = [];
  branches: any[] = [];

  leaveTypes = ['CASUAL', 'SICK', 'EMERGENCY', 'EARNED'];
  leaveForm: FormGroup;
  showForm = false;
  loading = false;
  currentUser: any = null;
  detectedEmployee: any = null;

  // Leave Balances (100% Dynamic API loaded)
  leaveBalance = { CASUAL: 0, SICK: 0, EARNED: 0, EMERGENCY: 0 };

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.leaveForm = this.fb.group({
      employee_id: [1, Validators.required],
      company_id: [1, Validators.required],
      branch_id: [1, Validators.required],
      leave_type: ['CASUAL', Validators.required],
      from_date: ['', Validators.required],
      to_date: ['', Validators.required],
      total_days: [1, [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.loadLookups();
    this.setupDateListeners();
  }

  loadLookups() {
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
        this.detectEmployeeMapping();
        this.loadLeaveRequests();
      },
      error: () => { this.loading = false; }
    });
  }

  detectEmployeeMapping() {
    if (!this.currentUser) {
      this.leaveForm.patchValue({ employee_id: 1, company_id: 1, branch_id: 1 });
      return;
    }

    const mapped = (this.employees || []).find(
      e => e.email?.toLowerCase() === this.currentUser.email?.toLowerCase() ||
           e.id === this.currentUser.userId ||
           e.id === this.currentUser.id ||
           e.id === this.currentUser.user_id
    ) || (this.employees.length > 0 ? this.employees[0] : null);

    if (mapped) {
      this.detectedEmployee = mapped;
      this.leaveForm.patchValue({
        employee_id: Number(mapped.id),
        company_id: Number(mapped.company_id || mapped.companyId || 1),
        branch_id: Number(mapped.branch_id || mapped.branchId || 1)
      });
      this.loadLeaveBalance(Number(mapped.id));
    } else {
      this.leaveForm.patchValue({ employee_id: 1, company_id: 1, branch_id: 1 });
      this.loadLeaveBalance(1);
    }
  }

  loadLeaveBalance(employeeId: number) {
    this.commonService.getApi(`leave/balance?employee_id=${employeeId}`).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.leaveBalance = res.data;
          this.cdr.detectChanges();
        }
      }
    });
  }

  setupDateListeners() {
    const calcDays = () => {
      const from = this.leaveForm.get('from_date')?.value;
      const to = this.leaveForm.get('to_date')?.value;

      if (from && to) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const diffTime = toDate.getTime() - fromDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        this.leaveForm.get('total_days')?.setValue(diffDays > 0 ? diffDays : 1);
      }
    };

    this.leaveForm.get('from_date')?.valueChanges.subscribe(calcDays);
    this.leaveForm.get('to_date')?.valueChanges.subscribe(calcDays);
  }

  loadLeaveRequests() {
    this.commonService.getApi('leave').subscribe({
      next: (res: any) => {
        this.leaveRequests = (res?.data || []).map((item: any) => {
          const empId = Number(item.employee_id);
          const emp = this.employees.find(e => e.id === empId);
          return {
            ...item,
            employee_name: emp ? emp.name : `Employee ID: ${empId}`,
            date_range: `${item.from_date || item.start_date} to ${item.to_date || item.end_date}`
          };
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load leave requests:', err);
        this.loading = false;
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.leaveForm.reset({ leave_type: 'CASUAL', total_days: 1 });
      this.detectEmployeeMapping();
    }
  }

  submitLeaveRequest() {
    this.detectEmployeeMapping();

    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = {
      ...this.leaveForm.value,
      employee_id: Number(this.leaveForm.value.employee_id) || 1,
      company_id: Number(this.leaveForm.value.company_id) || 1,
      branch_id: Number(this.leaveForm.value.branch_id) || 1
    };

    this.commonService.postApi('leave/apply', payload).subscribe({
      next: () => {
        this.alert.success("Leave request submitted successfully. Awaiting Manager Approval.");
        this.showForm = false;
        this.loadLeaveRequests();
      },
      error: (err) => {
        console.error('Failed to submit leave:', err);
        this.alert.error("Submission failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  approveLeave(row: any) {
    if (!this.perm.canApproveLeave()) {
      this.alert.error("Access Denied: Regular employees cannot approve leave requests.");
      return;
    }

    this.alert.confirm("Are you sure you want to approve this leave request?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.putApi(`leave/approve/${row.id}`, {}).subscribe({
          next: () => {
            this.alert.success("Leave approved successfully! Attendance and Payroll synced.");
            this.loadLeaveRequests();
          },
          error: (err) => {
            console.error('Approval failed:', err);
            this.alert.error("Approval failed: " + (err.error?.message || "Internal error"));
            this.loading = false;
          }
        });
      }
    });
  }

  rejectLeave(row: any) {
    if (!this.perm.canApproveLeave()) {
      this.alert.error("Access Denied: Regular employees cannot reject leave requests.");
      return;
    }

    this.alert.confirm("Are you sure you want to reject this leave request?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.putApi(`leave/reject/${row.id}`, {}).subscribe({
          next: () => {
            this.alert.success("Leave request rejected.");
            this.loadLeaveRequests();
          },
          error: (err) => {
            console.error('Rejection failed:', err);
            this.alert.error("Rejection failed: " + (err.error?.message || "Internal error"));
            this.loading = false;
          }
        });
      }
    });
  }

  viewLeave(row: any) {
    this.alert.info(`Leave Application Details:\nEmployee: ${row.employee_name}\nType: ${row.leave_type}\nDates: ${row.date_range} (${row.total_days} Days)\nReason: ${row.reason}\nStatus: ${row.status}`);
  }
}
