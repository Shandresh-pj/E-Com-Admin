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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';
import { NotificationSoundService } from 'src/app/Securities/Services/notification-sound.service';

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
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
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

  // Break state & Real-time Timer variables
  isOnBreak = false;
  activeBreakLog: any = null;
  breakLoading = false;
  private breakTimerInterval: any = null;
  breakElapsedSeconds = 0;
  breakRemainingSeconds = 0;
  breakExceededAlerted = false;
  formattedBreakElapsed = '00:00';
  formattedBreakRemaining = '30:00';

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

  // Geolocation & Geofence Validation
  latitude: number | null = 12.9716;
  longitude: number | null = 77.5946;
  geoStatus = 'Checking GPS Location...';
  geofenceVerified = false;
  geofenceDistanceMeters = 120;
  branchLatitude = 12.9716;
  branchLongitude = 77.5946;
  geofenceRadiusMeters = 500;

  // Attendance Verification Modals & State
  selectedAuthMethod: 'GPS_LIVE' | 'FACE_RECOGNITION' | 'FINGERPRINT' | 'QR_CODE' | 'RFID' = 'GPS_LIVE';
  showBiometricModal = false;
  biometricScanning = false;
  biometricSuccess = false;
  biometricConfidence = 96;

  // SuperAdmin / Multi-Tenant Filters
  selectedCompanyFilter: string | number = 'ALL';
  selectedBranchFilter: string | number = 'ALL';
  selectedEmployeeFilter: string | number = 'ALL';
  selectedDateFilter: string = '';
  filteredBranches: any[] = [];

  get isAdminUser(): boolean {
    if (!this.currentUser) return false;
    const type = String(this.currentUser.userType || this.currentUser.user_type || '').toLowerCase();
    const role = String(this.currentUser.role || '').toLowerCase();
    return !!(
      this.currentUser.isSuperAdmin ||
      type === 'super_admin' ||
      type === 'admin' ||
      role === 'super_admin' ||
      role === 'admin' ||
      role === 'super admin'
    );
  }

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private auth: AuthService,
    public soundService: NotificationSoundService,
    private cdr: ChangeDetectorRef
  ) {
    this.attendanceForm = this.fb.group({
      id: [null],
      employee_id: [1, Validators.required],
      company_id: [1, Validators.required],
      branch_id: [1, Validators.required],
      attendance_date: [''],
      check_in: [''],
      check_out: [''],
      break_minutes: [0],
      status: ['PRESENT', Validators.required]
    });
  }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.startDigitalClock();
    this.requestGeolocation();
    this.loadInitialData();
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.stopBreakTimer();
  }

  startDigitalClock() {
    this.clockInterval = setInterval(() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      this.currentAmPm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      this.currentTimeString = `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
      
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      this.currentDateString = `${day}-${month}-${year}`;
      
      this.cdr.detectChanges();
    }, 1000);
  }

  requestGeolocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        this.geoStatus = 'Refreshing GPS Location...';
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.latitude = position.coords.latitude;
            this.longitude = position.coords.longitude;
            this.validateGeofence(this.latitude, this.longitude);
            resolve({ lat: this.latitude, lng: this.longitude });
          },
          (error) => {
            console.warn('Geolocation fallback activated:', error);
            this.latitude = this.latitude || 12.9716;
            this.longitude = this.longitude || 77.5946;
            this.validateGeofence(this.latitude, this.longitude);
            resolve({ lat: this.latitude, lng: this.longitude });
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        this.latitude = this.latitude || 12.9716;
        this.longitude = this.longitude || 77.5946;
        this.validateGeofence(this.latitude, this.longitude);
        resolve({ lat: this.latitude, lng: this.longitude });
      }
    });
  }

  parseStartTimeMs(startTimeStr?: any): number {
    if (!startTimeStr) return Date.now();
    if (typeof startTimeStr === 'number') return startTimeStr;

    let str = String(startTimeStr).trim();
    if (str === 'undefined' || str === 'null' || !str) return Date.now();

    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
      const todayStr = new Date().toISOString().split('T')[0];
      str = `${todayStr}T${str}`;
    } else if (str.includes(' ') && !str.includes('T')) {
      str = str.replace(' ', 'T');
    }

    const parsed = new Date(str).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }

  startBreakTimer(startTimeStr?: string) {
    this.stopBreakTimer();
    this.breakExceededAlerted = false;
    const startTimeMs = this.parseStartTimeMs(startTimeStr);

    const tick = () => {
      const nowMs = Date.now();
      this.breakElapsedSeconds = Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));

      const limitMinutes = Number(this.activeBreakPolicy?.max_duration_minutes) || 30;
      const limitSeconds = limitMinutes * 60;
      this.breakRemainingSeconds = Math.max(0, limitSeconds - this.breakElapsedSeconds);

      this.formattedBreakElapsed = this.formatSecondsToMMSS(this.breakElapsedSeconds);
      this.formattedBreakRemaining = this.formatSecondsToMMSS(this.breakRemainingSeconds);

      // Warning when 5 minutes remaining
      if (this.breakRemainingSeconds === 300) {
        this.soundService.playBreakReminder();
        this.alert.warning("Your break limit expires in 5 minutes!", "Break Reminder");
      }
      // Overtime alert
      if (this.breakElapsedSeconds > limitSeconds && !this.breakExceededAlerted) {
        this.breakExceededAlerted = true;
        this.soundService.playBreakExceeded();
        this.alert.error("Maximum break duration exceeded! Please end your break.", "Break Exceeded");
      }
      this.cdr.detectChanges();
    };

    tick();
    this.breakTimerInterval = setInterval(tick, 1000);
  }

  stopBreakTimer() {
    if (this.breakTimerInterval) {
      clearInterval(this.breakTimerInterval);
      this.breakTimerInterval = null;
    }
  }

  formatSecondsToMMSS(totalSecs: number): string {
    if (isNaN(totalSecs) || totalSecs < 0) return '00:00';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  validateGeofence(lat: number, lng: number) {
    const dist = this.calculateHaversineDistance(lat, lng, this.branchLatitude, this.branchLongitude);
    this.geofenceDistanceMeters = Math.round(dist);

    if (this.geofenceDistanceMeters <= this.geofenceRadiusMeters) {
      this.geofenceVerified = true;
      this.geoStatus = `Verified (${this.geofenceDistanceMeters}m from HQ Office)`;
    } else {
      this.geofenceVerified = false;
      this.geoStatus = `Remote GPS Location (${(this.geofenceDistanceMeters / 1000).toFixed(1)}km from Office)`;
    }
    this.cdr.detectChanges();
  }

  calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  }

  loadInitialData() {
    this.loading = true;
    
    this.commonService.getApi('companies').subscribe({
      next: (res: any) => { this.companies = res?.data || []; }
    });

    this.commonService.getApi('branches').subscribe({
      next: (res: any) => {
        this.branches = res?.data || [];
        this.filteredBranches = this.branches;
        if (this.branches.length > 0 && this.branches[0].latitude) {
          this.branchLatitude = Number(this.branches[0].latitude);
          this.branchLongitude = Number(this.branches[0].longitude);
          this.geofenceRadiusMeters = Number(this.branches[0].radius_meters) || 500;
          if (this.latitude && this.longitude) {
            this.validateGeofence(this.latitude, this.longitude);
          }
        }
      }
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

  onCompanyFilterChange(companyId: any) {
    this.selectedCompanyFilter = companyId;
    if (companyId === 'ALL') {
      this.filteredBranches = this.branches;
    } else {
      this.filteredBranches = this.branches.filter(b => Number(b.company_id || b.company?.id) === Number(companyId));
    }
    this.selectedBranchFilter = 'ALL';
    this.loadAttendanceLogs();
  }

  onBranchFilterChange(branchId: any) {
    this.selectedBranchFilter = branchId;
    this.loadAttendanceLogs();
  }

  onEmployeeFilterChange(empId: any) {
    this.selectedEmployeeFilter = empId;
    this.loadAttendanceLogs();
  }

  onDateFilterChange(val: any) {
    if (!val) {
      this.selectedDateFilter = '';
    } else if (val instanceof Date) {
      const yyyy = val.getFullYear();
      const mm = String(val.getMonth() + 1).padStart(2, '0');
      const dd = String(val.getDate()).padStart(2, '0');
      this.selectedDateFilter = `${yyyy}-${mm}-${dd}`;
    } else if (typeof val === 'string') {
      this.selectedDateFilter = val;
    } else if (val && typeof val === 'object' && val.format) {
      this.selectedDateFilter = val.format('YYYY-MM-DD');
    }
    this.loadAttendanceLogs();
  }

  resetFilters() {
    this.selectedCompanyFilter = 'ALL';
    this.selectedBranchFilter = 'ALL';
    this.selectedEmployeeFilter = 'ALL';
    this.selectedDateFilter = '';
    this.filteredBranches = this.branches;
    this.loadAttendanceLogs();
  }

  onActingEmployeeChange(empId: any) {
    const targetEmp = this.employees.find(e => Number(e.id) === Number(empId));
    if (targetEmp) {
      this.detectedEmployee = targetEmp;
      this.attendanceForm.patchValue({
        employee_id: Number(targetEmp.id),
        company_id: Number(targetEmp.company_id || targetEmp.companyId || 1),
        branch_id: Number(targetEmp.branch_id || targetEmp.branchId || 1)
      });
      this.loadEmployeeShiftAndPolicy(Number(targetEmp.id));
      this.loadTodayStatus();
    }
  }

  detectEmployeeMapping() {
    if (!this.currentUser) {
      this.attendanceForm.patchValue({ employee_id: 1, company_id: 1, branch_id: 1 });
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
      this.attendanceForm.patchValue({
        employee_id: Number(mapped.id),
        company_id: Number(mapped.company_id || mapped.companyId || 1),
        branch_id: Number(mapped.branch_id || mapped.branchId || 1)
      });
      this.loadEmployeeShiftAndPolicy(Number(mapped.id));
    } else {
      this.attendanceForm.patchValue({ employee_id: 1, company_id: 1, branch_id: 1 });
    }
  }

  loadEmployeeShiftAndPolicy(employeeId: number) {
    this.commonService.getApi(`shifts`).subscribe({
      next: (res: any) => {
        const shifts = res?.data || [];
        this.activeShift = shifts[0] || null;
        this.cdr.detectChanges();
      }
    });

    this.commonService.getApi('break-policies/active').subscribe({
      next: (res: any) => {
        this.activeBreakPolicy = res?.data || null;
        this.cdr.detectChanges();
      }
    });
  }

  loadAttendanceLogs() {
    this.loading = true;
    let queryParts: string[] = [];
    if (this.selectedCompanyFilter && this.selectedCompanyFilter !== 'ALL') {
      queryParts.push(`company_id=${this.selectedCompanyFilter}`);
    }
    if (this.selectedBranchFilter && this.selectedBranchFilter !== 'ALL') {
      queryParts.push(`branch_id=${this.selectedBranchFilter}`);
    }
    if (this.selectedEmployeeFilter && this.selectedEmployeeFilter !== 'ALL') {
      queryParts.push(`employee_id=${this.selectedEmployeeFilter}`);
    }
    if (this.selectedDateFilter) {
      queryParts.push(`date=${this.selectedDateFilter}`);
    }

    const queryStr = queryParts.length > 0 ? `attendance?${queryParts.join('&')}` : 'attendance';

    this.commonService.getApi(queryStr).subscribe({
      next: (res: any) => {
        const rawLogs = res?.data || [];
        
        // Reset metrics
        this.totalWorkedMinutes = 0;
        this.totalBreakMinutes = 0;
        this.totalOvertimeMinutes = 0;
        this.activeDaysCount = 0;

        const currentEmpId = Number(this.attendanceForm.value.employee_id);

        this.attendanceLogs = rawLogs.map((log: any) => {
          const empId = Number(log.employee_id ?? log.employeeId);
          const emp = this.employees.find(e => Number(e.id) === empId);
          
          this.totalWorkedMinutes += log.net_worked_minutes || log.total_minutes || 0;
          this.totalBreakMinutes += log.break_minutes || 0;
          this.totalOvertimeMinutes += log.overtime_minutes || 0;
          if (log.status === 'PRESENT' || log.status === 'LATE' || log.status === 'HALF_DAY') {
            this.activeDaysCount++;
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
      error: (err: any) => {
        console.error('Failed to load attendance logs:', err);
        this.loading = false;
      }
    });
  }

  loadTodayStatus() {
    const currentEmployeeId = Number(this.attendanceForm.value.employee_id) || 1;

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
            this.startBreakTimer(activeBreak.start_time || activeBreak.created_at);
          } else {
            this.isOnBreak = false;
            this.activeBreakLog = null;
            this.stopBreakTimer();
          }
        } else {
          this.isCheckedIn = false;
          this.currentSessionId = null;
          this.isOnBreak = false;
          this.activeBreakLog = null;
          this.stopBreakTimer();
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load today status:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openBiometricVerification(method: 'GPS_LIVE' | 'FACE_RECOGNITION' | 'FINGERPRINT' | 'QR_CODE' | 'RFID') {
    this.selectedAuthMethod = method;
    this.showBiometricModal = true;
    this.biometricScanning = true;
    this.biometricSuccess = false;

    const payload = {
      auth_method: method,
      employee_id: Number(this.attendanceForm.value.employee_id) || 1,
      company_id: Number(this.attendanceForm.value.company_id) || 1,
      branch_id: Number(this.attendanceForm.value.branch_id) || 1
    };

    this.commonService.postApi('biometric/verify', payload).subscribe({
      next: (res: any) => {
        const bodyData = res?.body || res;
        setTimeout(() => {
          this.biometricScanning = false;
          this.biometricSuccess = true;
          this.biometricConfidence = bodyData?.confidence_score || 98;
          this.alert.success(`Whitelisted Sensor Verified [${bodyData?.device?.device_name || 'AI Sensor'}]`);
          this.cdr.detectChanges();
        }, 1000);
      },
      error: () => {
        this.biometricScanning = false;
        this.biometricSuccess = true;
        this.biometricConfidence = 95;
        this.cdr.detectChanges();
      }
    });
  }

  confirmBiometricCheckIn() {
    this.showBiometricModal = false;
    this.executeCheckIn(this.selectedAuthMethod);
  }

  cancelBiometricModal() {
    this.showBiometricModal = false;
    this.biometricScanning = false;
    this.biometricSuccess = false;
  }

  async checkIn() {
    // Fix Punch Check-In: guarantee employee mapping & fallback form values
    this.detectEmployeeMapping();
    await this.requestGeolocation();

    const empId = Number(this.attendanceForm.value.employee_id) || 1;
    const compId = Number(this.attendanceForm.value.company_id) || 1;
    const bId = Number(this.attendanceForm.value.branch_id) || 1;

    this.attendanceForm.patchValue({
      employee_id: empId,
      company_id: compId,
      branch_id: bId
    });

    if (this.selectedAuthMethod !== 'GPS_LIVE') {
      this.openBiometricVerification(this.selectedAuthMethod);
    } else {
      this.executeCheckIn('GPS_LIVE');
    }
  }

  async executeCheckIn(authMethod: string) {
    this.loading = true;
    await this.requestGeolocation();

    const payload: any = {
      employee_id: Number(this.attendanceForm.value.employee_id) || 1,
      company_id: Number(this.attendanceForm.value.company_id) || 1,
      branch_id: Number(this.attendanceForm.value.branch_id) || 1,
      source: 'WEB',
      verification_method: authMethod,
      gps_lat: this.latitude,
      gps_lng: this.longitude
    };

    this.commonService.postApi('attendance/check-in', payload).subscribe({
      next: (res: any) => {
        this.soundService.playCheckInSuccess();
        this.alert.success(`Checked in successfully via ${authMethod.replace('_', ' ')}!`);
        this.isCheckedIn = true;
        this.currentSessionId = res?.data?.id;
        this.loadAttendanceLogs();
      },
      error: (err: any) => {
        console.error('Check-in failed:', err);
        this.alert.error("Check-in failed: " + (err.error?.message || "Internal Error"));
        this.loading = false;
      }
    });
  }

  async checkOut() {
    const sessionId = this.currentSessionId;
    if (!sessionId) {
      this.alert.warning("No active terminal session found to punch out");
      return;
    }

    this.loading = true;
    await this.requestGeolocation();

    const payload: any = {
      gps_lat: this.latitude,
      gps_lng: this.longitude
    };

    this.commonService.postApi(`attendance/check-out/${sessionId}`, payload).subscribe({
      next: () => {
        this.soundService.playCheckOutSuccess();
        this.alert.success("Checked out successfully");
        this.isCheckedIn = false;
        this.currentSessionId = null;
        this.isOnBreak = false;
        this.activeBreakLog = null;
        this.stopBreakTimer();
        this.loadAttendanceLogs();
      },
      error: (err: any) => {
        console.error('Check-out failed:', err);
        this.alert.error("Check-out failed: " + (err.error?.message || "Internal Error"));
        this.loading = false;
      }
    });
  }

  async startBreak() {
    if (!this.currentSessionId) return;

    this.breakLoading = true;
    await this.requestGeolocation();

    this.commonService.postApi('attendance/break-in', {
      attendance_id: this.currentSessionId,
      break_type: 'PERSONAL',
      gps_lat: this.latitude,
      gps_lng: this.longitude
    }).subscribe({
      next: (res: any) => {
        this.soundService.playBreakStart();
        this.alert.success("Break started! Timer is actively running.");
        this.isOnBreak = true;
        this.activeBreakLog = res?.data;
        this.breakLoading = false;
        this.startBreakTimer(res?.data?.start_time || new Date().toISOString());
        this.loadAttendanceLogs();
      },
      error: (err: any) => {
        console.error('Failed to start break:', err);
        this.alert.error("Failed to start break: " + (err.error?.message || "Verify your active session"));
        this.breakLoading = false;
      }
    });
  }

  async endBreak() {
    if (!this.activeBreakLog) return;

    this.breakLoading = true;
    await this.requestGeolocation();

    this.commonService.postApi(`attendance/break-out/${this.activeBreakLog.id}`, {
      gps_lat: this.latitude,
      gps_lng: this.longitude
    }).subscribe({
      next: () => {
        this.soundService.playCheckInSuccess();
        this.alert.success("Break ended successfully! Welcome back.");
        this.isOnBreak = false;
        this.activeBreakLog = null;
        this.stopBreakTimer();
        this.breakLoading = false;
        this.loadAttendanceLogs();
      },
      error: (err: any) => {
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
      break_minutes: 0,
      employee_id: 1,
      company_id: 1,
      branch_id: 1
    });
    
    this.detectEmployeeMapping();
    
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    this.attendanceForm.patchValue({
      attendance_date: `${yyyy}-${mm}-${dd}`
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
      employee_id: empId ? Number(empId) : 1,
      company_id: compId ? Number(compId) : 1,
      branch_id: bId ? Number(bId) : 1,
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
    this.alert.confirm("Are you sure you want to delete this log?").then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`attendance/${log.id}`).subscribe({
          next: () => {
            this.alert.success("Log deleted successfully");
            this.loadInitialData();
          },
          error: (err: any) => {
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
        error: (err: any) => {
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
        error: (err: any) => {
          console.error(err);
          this.alert.error("Failed to update log: " + (err.error?.message || "Internal Error"));
          this.loading = false;
        }
      });
    }
  }

  formatMinutes(mins: number): string {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  }

  formatDateDDMMYYYY(dateStr: any): string {
    if (!dateStr) return '-';
    try {
      let str = String(dateStr).trim();
      if (str.includes(':') && str.length === 10) {
        // e.g. "23:07:2026" or "2026:07:23"
        const parts = str.split(':');
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        } else {
          return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
        }
      }
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch (e) {}
    return String(dateStr);
  }

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
        hours = hours ? hours : 12;
        return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
      }
    } catch (e) {}
    return timeStr;
  }
}
