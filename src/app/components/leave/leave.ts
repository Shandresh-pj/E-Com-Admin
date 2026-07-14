import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Subscription } from 'rxjs';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTable
  ],
  templateUrl: './leave.html',
  styleUrl: './leave.scss',
})
export class Leave implements OnInit {
  tableColumns: TableColumn[] = [
    { columnDef: 'employee_name', header: 'Employee' },
    { columnDef: 'start_date', header: 'Start Date' },
    { columnDef: 'end_date', header: 'End Date' },
    { columnDef: 'total_days', header: 'Duration' },
    { columnDef: 'leave_type', header: 'Type', type: 'custom' },
    { columnDef: 'status', header: 'Status', type: 'custom' },
    { columnDef: 'reason', header: 'Reason' }
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

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private auth: AuthService
  ) {
    this.leaveForm = this.fb.group({
      employee_id: ['', Validators.required],
      company_id: ['', Validators.required],
      branch_id: ['', Validators.required],
      leave_type: ['CASUAL', Validators.required],
      from_date: ['', Validators.required],
      to_date: ['', Validators.required],
      total_days: [{ value: 0, disabled: true }, [Validators.required, Validators.min(1)]],
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
    if (!this.currentUser) return;

    const mapped = this.employees.find(
      e => e.email?.toLowerCase() === this.currentUser.email?.toLowerCase()
    );

    if (mapped) {
      this.detectedEmployee = mapped;
      this.leaveForm.patchValue({
        employee_id: mapped.id,
        company_id: mapped.company_id || (mapped.company?.id),
        branch_id: mapped.branch_id || (mapped.branch?.id)
      });
    }
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

        this.leaveForm.get('total_days')?.setValue(diffDays > 0 ? diffDays : 0);
      } else {
        this.leaveForm.get('total_days')?.setValue(0);
      }
    };

    this.leaveForm.get('from_date')?.valueChanges.subscribe(calcDays);
    this.leaveForm.get('to_date')?.valueChanges.subscribe(calcDays);
  }

  loadLeaveRequests() {
    this.commonService.getApi('leave').subscribe({
      next: (res: any) => {
        this.leaveRequests = (res?.data || []).map((item: any) => {
          const emp = this.employees.find(e => e.id === item.employee_id);
          return {
            ...item,
            employee_name: emp ? emp.name : `Employee ID: ${item.employee_id}`,
            start_date: item.from_date || item.start_date || '',
            end_date: item.to_date || item.end_date || '',
            date_range: `${item.from_date || item.start_date} to ${item.to_date || item.end_date}`
          };
        });
        this.loading = false;
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
      this.leaveForm.reset({ leave_type: 'CASUAL', total_days: 0 });
      this.detectEmployeeMapping();
    }
  }

  formatDateForBackend(dateVal: any): string {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, '0');
      const day = String(dateVal.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(dateVal);
  }

  submitLeaveRequest() {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = {
      ...this.leaveForm.getRawValue(),
      from_date: this.formatDateForBackend(this.leaveForm.get('from_date')?.value),
      to_date: this.formatDateForBackend(this.leaveForm.get('to_date')?.value)
    };

    this.commonService.postApi('leave/apply', payload).subscribe({
      next: () => {
        this.alert.success("Leave request submitted successfully");
        this.toggleForm();
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
    this.alert.confirm("Are you sure you want to approve this leave request?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.putApi(`leave/approve/${row.id}`, {}).subscribe({
          next: () => {
            this.alert.success("Leave approved successfully");
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
    this.alert.confirm("Are you sure you want to reject this leave request?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.putApi(`leave/reject/${row.id}`, {}).subscribe({
          next: () => {
            this.alert.success("Leave request rejected successfully");
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
}
