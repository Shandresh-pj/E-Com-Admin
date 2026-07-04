import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-attendance',
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
    MatTable
  ],
  templateUrl: './attendance.html',
  styleUrl: './attendance.scss',
})
export class Attendance implements OnInit {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'employee_name', header: 'Employee' },
    { columnDef: 'attendance_date', header: 'Date' },
    { columnDef: 'check_in', header: 'Check In' },
    { columnDef: 'check_out', header: 'Check Out' },
    { columnDef: 'total_hours', header: 'Working Hours' },
    { columnDef: 'overtime_hours', header: 'Overtime' },
    { columnDef: 'status', header: 'Status' }
  ];

  attendanceLogs: any[] = [];
  employees: any[] = [];
  companies: any[] = [];
  branches: any[] = [];
  
  attendanceForm: FormGroup;
  isCheckedIn = false;
  currentSessionId: number | null = null;
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
    this.attendanceForm = this.fb.group({
      employee_id: ['', Validators.required],
      company_id: ['', Validators.required],
      branch_id: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.loadInitialData();
  }

  loadInitialData() {
    this.loading = true;
    
    // Load companies, branches, employees and attendance logs in sequence/parallel
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
        this.loadAttendanceLogs();
      },
      error: () => { this.loading = false; }
    });
  }

  detectEmployeeMapping() {
    if (!this.currentUser) return;
    
    // Attempt to map logged-in user to employee record by email matching
    const mapped = this.employees.find(
      e => e.email?.toLowerCase() === this.currentUser.email?.toLowerCase()
    );

    if (mapped) {
      this.detectedEmployee = mapped;
      this.attendanceForm.patchValue({
        employee_id: mapped.id,
        company_id: mapped.company_id || (mapped.company?.id),
        branch_id: mapped.branch_id || (mapped.branch?.id)
      });
    }
  }

  loadAttendanceLogs() {
    this.commonService.getApi('attendance').subscribe({
      next: (res: any) => {
        const rawLogs = res?.data || [];
        this.attendanceLogs = rawLogs.map((log: any) => {
          const emp = this.employees.find(e => e.id === log.employee_id);
          return {
            ...log,
            employee_name: emp ? emp.name : `Employee ID: ${log.employee_id}`,
            total_hours: log.total_minutes ? `${Math.floor(log.total_minutes / 60)}h ${log.total_minutes % 60}m` : '-',
            overtime_hours: log.overtime_minutes ? `${Math.floor(log.overtime_minutes / 60)}h ${log.overtime_minutes % 60}m` : '-'
          };
        });

        // Determine if user is currently checked in (has a record today with check_out empty)
        const todayDateString = new Date().toLocaleDateString('en-GB').replace(/\//g, ':'); // DD:MM:YYYY format
        const activeSession = rawLogs.find(
          (log: any) => log.employee_id === this.attendanceForm.value.employee_id && !log.check_out
        );

        if (activeSession) {
          this.isCheckedIn = true;
          this.currentSessionId = activeSession.id;
        } else {
          this.isCheckedIn = false;
          this.currentSessionId = null;
        }
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load attendance logs:', err);
        this.loading = false;
      }
    });
  }

  checkIn() {
    if (this.attendanceForm.invalid) {
      this.attendanceForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.attendanceForm.value;
    
    this.commonService.postApi('attendance/checkin', payload).subscribe({
      next: (res: any) => {
        this.alert.success("Checked in successfully");
        this.isCheckedIn = true;
        this.currentSessionId = res?.data?.id;
        this.loadAttendanceLogs();
      },
      error: (err) => {
        console.error('Check-in failed:', err);
        this.alert.error("Check-in failed: " + (err.error?.message || "Internal Error"));
        this.loading = false;
      }
    });
  }

  checkOut() {
    const sessionId = this.currentSessionId;
    if (!sessionId) return;

    this.loading = true;
    this.commonService.postApi(`attendance/checkout/${sessionId}`, {}).subscribe({
      next: () => {
        this.alert.success("Checked out successfully");
        this.isCheckedIn = false;
        this.currentSessionId = null;
        this.loadAttendanceLogs();
      },
      error: (err) => {
        console.error('Check-out failed:', err);
        this.alert.error("Check-out failed: " + (err.error?.message || "Internal Error"));
        this.loading = false;
      }
    });
  }
}
