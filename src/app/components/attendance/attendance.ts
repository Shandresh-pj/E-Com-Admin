import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

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
    MatProgressBarModule,
    MatTable,
    AppTranslatePipe
  ],
  templateUrl: './attendance.html',
  styleUrl: './attendance.scss',
})
export class Attendance implements OnInit, OnDestroy {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'employee_name', header: 'Employee' },
    { columnDef: 'attendance_date', header: 'Date' },
    { columnDef: 'check_in', header: 'Check In' },
    { columnDef: 'check_out', header: 'Check Out' },
    { columnDef: 'break_minutes', header: 'Break (min)' },
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

  // Active shift & policy info
  activeShift: any = null;
  activeBreakPolicy: any = null;

  // Break state variables
  isOnBreak = false;
  activeBreakLog: any = null;
  breakLoading = false;

  // Admin CRUD form toggle
  showForm = false;
  updateButton = false;
  editingLogId: number | null = null;
  viewMode = false;
  selectedLog: any = null;

  // Digital Clock & Status Stats
  currentTimeString = '00:00:00';
  currentAmPm = 'AM';
  currentDateString = '';
  private clockInterval: any;

  // Live Stats computed
  totalWorkedMinutes = 0;
  totalBreakMinutes = 0;
  totalOvertimeMinutes = 0;
  activeDaysCount = 0;

  // Geolocation
  latitude: number | null = null;
  longitude: number | null = null;
  geoStatus = 'Checking Geolocation...';

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.attendanceForm = this.fb.group({
      id: [null],
      employee_id: ['', Validators.required],
      company_id: ['', Validators.required],
      branch_id: ['', Validators.required],
      attendance_date: [''],
      check_in: [''],
      check_out: [''],
      break_minutes: [0],
      status: ['PRESENT', Validators.required]
    });
  }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.detectEmployeeMapping();
    this.loadInitialData();
    this.startDigitalClock();
    this.requestGeolocation();
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  startDigitalClock() {
    this.clockInterval = setInterval(() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      this.currentAmPm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // hour 0 should be 12
      this.currentTimeString = `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
      
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      this.currentDateString = `${day}-${month}-${year}`;
      
      this.cdr.detectChanges();
    }, 1000);
  }

  requestGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.latitude = position.coords.latitude;
          this.longitude = position.coords.longitude;
          this.geoStatus = 'GPS Signal Secured';
          this.cdr.detectChanges();
        },
        (error) => {
          console.warn('Geolocation access failed:', error);
          this.geoStatus = 'GPS Unavailable (Using Network IP)';
          this.cdr.detectChanges();
        }
      );
    } else {
      this.geoStatus = 'Geolocation Unsupported';
    }
  }

  loadInitialData() {
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
        this.loadAttendanceLogs();
      },
      error: () => { this.loading = false; }
    });
  }

  detectEmployeeMapping() {
    if (!this.currentUser) return;
    
    const mapped = (this.employees || []).find(
      e => e.email?.toLowerCase() === this.currentUser.email?.toLowerCase() ||
           e.id === this.currentUser.userId ||
           e.id === this.currentUser.user_id
    );

    const isSuper = this.currentUser.userType === 'SUPER_ADMIN' || this.currentUser.role === 'SUPER_ADMIN';
    const compId = mapped?.company_id ?? mapped?.companyId ?? mapped?.company?.id ?? (!isSuper ? (this.currentUser.company_id ?? this.currentUser.companyId) : '');
    const bId = mapped?.branch_id ?? mapped?.branchId ?? mapped?.branch?.id ?? (!isSuper ? (this.currentUser.branch_id ?? this.currentUser.branchId) : '');
    const empId = mapped?.id ?? (!isSuper ? (this.currentUser.userId ?? this.currentUser.user_id) : '');

    if (mapped) {
      this.detectedEmployee = mapped;
    } else if (empId && !isSuper) {
      this.detectedEmployee = { id: empId, name: this.currentUser.name || 'Current Employee', email: this.currentUser.email };
    }

    if (empId || compId || bId) {
      this.attendanceForm.patchValue({
        employee_id: empId ? Number(empId) : this.attendanceForm.value.employee_id,
        company_id: compId ? Number(compId) : this.attendanceForm.value.company_id,
        branch_id: bId ? Number(bId) : this.attendanceForm.value.branch_id
      });
    }

    if (empId) {
      this.loadEmployeeShiftAndPolicy(Number(empId));
    }
  }

  loadEmployeeShiftAndPolicy(employeeId: number) {
    // Get active shift
    this.commonService.getApi(`shifts/employee/${employeeId}`).subscribe({
      next: (res: any) => {
        this.activeShift = res?.data?.shift || null;
        this.cdr.detectChanges();
      }
    });

    // Get active break policy
    this.commonService.getApi('break-policies/active').subscribe({
      next: (res: any) => {
        this.activeBreakPolicy = res?.data || null;
        this.cdr.detectChanges();
      }
    });
  }

  loadAttendanceLogs() {
    this.commonService.getApi('attendance').subscribe({
      next: (res: any) => {
        const rawLogs = res?.data || [];
        
        // Reset metrics
        this.totalWorkedMinutes = 0;
        this.totalBreakMinutes = 0;
        this.totalOvertimeMinutes = 0;
        this.activeDaysCount = 0;

        this.attendanceLogs = rawLogs.map((log: any) => {
          const empId = log.employee_id ?? log.employeeId;
          const emp = this.employees.find(e => e.id === empId);
          
          if (empId === this.attendanceForm.value.employee_id) {
            this.totalWorkedMinutes += log.net_worked_minutes || log.total_minutes || 0;
            this.totalBreakMinutes += log.break_minutes || 0;
            this.totalOvertimeMinutes += log.overtime_minutes || 0;
            if (log.status === 'PRESENT' || log.status === 'LATE' || log.status === 'HALF_DAY') {
              this.activeDaysCount++;
            }
          }

          return {
            ...log,
            employee_id: empId,
            company_id: log.company_id ?? log.companyId,
            branch_id: log.branch_id ?? log.branchId,
            employee_name: emp ? emp.name : `Employee ID: ${empId}`,
            rawDate: log.attendance_date,
            rawCheckIn: log.check_in,
            rawCheckOut: log.check_out,
            attendance_date: this.formatDateDDMMYYYY(log.attendance_date),
            check_in: this.formatTime12h(log.check_in),
            check_out: this.formatTime12h(log.check_out),
            total_hours: log.total_minutes ? `${Math.floor(log.total_minutes / 60)}h ${log.total_minutes % 60}m` : '-',
            overtime_hours: log.overtime_minutes ? `${Math.floor(log.overtime_minutes / 60)}h ${log.overtime_minutes % 60}m` : '-'
          };
        });

        this.loadTodayStatus();
      },
      error: (err) => {
        console.error('Failed to load attendance logs:', err);
        this.loading = false;
      }
    });
  }

  loadTodayStatus() {
    const currentEmployeeId = this.attendanceForm.value.employee_id;
    if (!currentEmployeeId) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.commonService.getApi(`attendance/today?employee_id=${currentEmployeeId}`).subscribe({
      next: (res: any) => {
        const todayData = res?.data;
        const activeSession = todayData?.attendance;
        const activeBreak = todayData?.activeBreak;

        if (activeSession && !activeSession.check_out) {
          this.isCheckedIn = true;
          this.currentSessionId = activeSession.id;
          
          if (activeBreak && !activeBreak.end_time) {
            this.isOnBreak = true;
            this.activeBreakLog = activeBreak;
          } else {
            this.isOnBreak = false;
            this.activeBreakLog = null;
          }
        } else {
          this.isCheckedIn = false;
          this.currentSessionId = null;
          this.isOnBreak = false;
          this.activeBreakLog = null;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load today status:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }



  checkActiveBreak(attendanceId: number) {
    this.commonService.getApi(`attendance/breaks/${attendanceId}`).subscribe({
      next: (res: any) => {
        const breakLogs = res?.data || [];
        const activeBreak = breakLogs.find((b: any) => !b.end_time);
        if (activeBreak) {
          this.isOnBreak = true;
          this.activeBreakLog = activeBreak;
        } else {
          this.isOnBreak = false;
          this.activeBreakLog = null;
        }
        this.cdr.detectChanges();
      }
    });
  }

  checkIn() {
    const isSuper = this.currentUser?.userType === 'SUPER_ADMIN' || this.currentUser?.role === 'SUPER_ADMIN';
    if (!isSuper) {
      this.detectEmployeeMapping();
    }

    if (this.attendanceForm.get('employee_id')?.invalid ||
        this.attendanceForm.get('company_id')?.invalid ||
        this.attendanceForm.get('branch_id')?.invalid) {
      this.attendanceForm.get('employee_id')?.markAsTouched();
      this.attendanceForm.get('company_id')?.markAsTouched();
      this.attendanceForm.get('branch_id')?.markAsTouched();
      return;
    }

    this.loading = true;
    const payload: any = {
      employee_id: this.attendanceForm.value.employee_id,
      company_id: this.attendanceForm.value.company_id,
      branch_id: this.attendanceForm.value.branch_id,
      source: 'WEB'
    };

    if (this.latitude && this.longitude) {
      payload.gps_lat = this.latitude;
      payload.gps_lng = this.longitude;
    }
    
    this.commonService.postApi('attendance/check-in', payload).subscribe({
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
    const payload: any = {};
    if (this.latitude && this.longitude) {
      payload.gps_lat = this.latitude;
      payload.gps_lng = this.longitude;
    }

    this.commonService.postApi(`attendance/check-out/${sessionId}`, payload).subscribe({
      next: () => {
        this.alert.success("Checked out successfully");
        this.isCheckedIn = false;
        this.currentSessionId = null;
        this.isOnBreak = false;
        this.activeBreakLog = null;
        this.loadAttendanceLogs();
      },
      error: (err) => {
        console.error('Check-out failed:', err);
        this.alert.error("Check-out failed: " + (err.error?.message || "Internal Error"));
        this.loading = false;
      }
    });
  }

  startBreak() {
    if (!this.currentSessionId) return;

    this.breakLoading = true;
    this.commonService.postApi('attendance/break-in', {
      attendance_id: this.currentSessionId,
      break_type: 'PERSONAL'
    }).subscribe({
      next: (res: any) => {
        this.alert.success("Break started");
        this.isOnBreak = true;
        this.activeBreakLog = res?.data;
        this.breakLoading = false;
        this.loadAttendanceLogs();
      },
      error: (err) => {
        console.error('Failed to start break:', err);
        this.alert.error("Failed to start break: " + (err.error?.message || "Verify your active session"));
        this.breakLoading = false;
      }
    });
  }

  endBreak() {
    if (!this.activeBreakLog) return;

    this.breakLoading = true;
    this.commonService.postApi(`attendance/break-out/${this.activeBreakLog.id}`, {}).subscribe({
      next: () => {
        this.alert.success("Break ended successfully");
        this.isOnBreak = false;
        this.activeBreakLog = null;
        this.breakLoading = false;
        this.loadAttendanceLogs();
      },
      error: (err) => {
        console.error('Failed to end break:', err);
        this.alert.error("Failed to end break");
        this.breakLoading = false;
      }
    });
  }

  // ==========================================
  // ADMIN MANUAL CRUD LOGIC
  // ==========================================
  
  AddNewLog() {
    this.showForm = true;
    this.updateButton = false;
    this.editingLogId = null;
    this.attendanceForm.reset({
      status: 'PRESENT',
      break_minutes: 0
    });
    
    this.detectEmployeeMapping();
    
    // Set default date
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    this.attendanceForm.patchValue({
      attendance_date: `${dd}:${mm}:${yyyy}`
    });
  }

  editLog(log: any) {
    this.showForm = true;
    this.viewMode = false;
    this.updateButton = true;
    this.editingLogId = log.id;
    
    const empId = log.employee_id ?? log.employeeId;
    const compId = log.company_id ?? log.companyId;
    const bId = log.branch_id ?? log.branchId;

    this.attendanceForm.patchValue({
      id: log.id,
      employee_id: empId ? Number(empId) : '',
      company_id: compId ? Number(compId) : '',
      branch_id: bId ? Number(bId) : '',
      attendance_date: log.rawDate || log.attendance_date,
      check_in: log.rawCheckIn || log.check_in,
      check_out: log.rawCheckOut || log.check_out,
      break_minutes: log.break_minutes || 0,
      status: log.status || 'PRESENT'
    });
  }

  viewLog(log: any) {
    this.viewMode = true;
    this.showForm = false;
    this.selectedLog = log;
    this.cdr.detectChanges();
  }

  closeView() {
    this.viewMode = false;
    this.selectedLog = null;
    this.cdr.detectChanges();
  }

  deleteLog(log: any) {
    this.alert.confirm("Are you sure you want to delete this log?").then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`attendance/${log.id}`).subscribe({
          next: () => {
            this.alert.success("Log deleted successfully");
            this.loadInitialData();
          },
          error: (err) => {
            this.alert.error("Failed to delete log: " + (err.error?.message || "Internal Error"));
          }
        });
      }
    });
  }

  cancelForm() {
    this.showForm = false;
    this.updateButton = false;
    this.editingLogId = null;
    this.attendanceForm.reset({
      status: 'PRESENT'
    });
    this.detectEmployeeMapping();
  }

  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = form.getRawValue();

    if (!this.updateButton) {
      this.commonService.postApi('attendance/manual', payload).subscribe({
        next: () => {
          this.alert.success("Attendance log created successfully");
          this.showForm = false;
          this.loadInitialData();
        },
        error: (err) => {
          console.error(err);
          this.alert.error("Failed to create log: " + (err.error?.message || "Internal Error"));
          this.loading = false;
        }
      });
    } else {
      this.commonService.putApi(`attendance/${this.editingLogId}`, payload).subscribe({
        next: () => {
          this.alert.success("Attendance log updated successfully");
          this.showForm = false;
          this.loadInitialData();
        },
        error: (err) => {
          console.error(err);
          this.alert.error("Failed to update log: " + (err.error?.message || "Internal Error"));
          this.loading = false;
        }
      });
    }
  }

  // Format minutes helper
  formatMinutes(mins: number): string {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  }

  // Format date helper (YYYY-MM-DD to DD-MM-YYYY)
  formatDateDDMMYYYY(dateStr: any): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch (e) {}
    return dateStr;
  }

  // Format time helper (24h to 12h AM/PM)
  formatTime12h(timeStr: any): string {
    if (!timeStr) return '-';
    try {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1].padStart(2, '0');
        const seconds = parts[2] ? parts[2].substring(0, 2).padStart(2, '0') : '00';
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // hour 0 should be 12
        return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
      }
    } catch (e) {}
    return timeStr;
  }
}
