import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-workforce',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    TablerIconsModule,
    MatTable
],
  templateUrl: './workforce.html',
  styleUrl: './workforce.scss'
})
export class Workforce implements OnInit {
  // Configured columns
  shiftColumns = [
    { columnDef: 'id', header: 'ID' },
    { columnDef: 'name', header: 'Shift Name' },
    { columnDef: 'type', header: 'Pattern Type' },
    { columnDef: 'timings', header: 'Timings' },
    { columnDef: 'grace_period_minutes', header: 'Grace (min)' },
    { columnDef: 'min_work_minutes', header: 'Min Work' },
    { columnDef: 'is_active', header: 'Active' }
  ];

  policyColumns = [
    { columnDef: 'id', header: 'ID' },
    { columnDef: 'name', header: 'Policy Name' },
    { columnDef: 'break_type', header: 'Break Type' },
    { columnDef: 'max_duration_minutes', header: 'Max Duration' },
    { columnDef: 'max_frequency', header: 'Max Frequency' },
    { columnDef: 'is_paid', header: 'Paid Status' },
    { columnDef: 'is_active', header: 'Status', type: 'badge' }
  ];

  deviceColumns = [
    { columnDef: 'id', header: 'ID' },
    { columnDef: 'device_name', header: 'Device Name' },
    { columnDef: 'device_serial', header: 'Serial Number' },
    { columnDef: 'device_type', header: 'Auth Sensor' },
    { columnDef: 'location', header: 'Location' },
    { columnDef: 'min_confidence_score', header: 'Confidence Limit' },
    { columnDef: 'status', header: 'Status' }
  ];

  logColumns = [
    { columnDef: 'id', header: 'Log ID' },
    { columnDef: 'employee_id', header: 'Employee' },
    { columnDef: 'device_serial', header: 'Device Serial' },
    { columnDef: 'action_type', header: 'Action' },
    { columnDef: 'status', header: 'Verification' },
    { columnDef: 'confidence_score', header: 'Confidence' },
    { columnDef: 'attempted_at', header: 'Attempted At' }
  ];

  // Data Store Arrays
  shiftsList: any[] = [];
  policiesList: any[] = [];
  devicesList: any[] = [];
  authLogsList: any[] = [];
  employeesList: any[] = [];

  // Form Groups
  shiftForm: FormGroup;
  shiftAssignForm: FormGroup;
  policyForm: FormGroup;
  deviceForm: FormGroup;

  // Loading States
  loading = false;
  activeTab = 0;

  // View States
  showShiftForm = false;
  editingShiftId: number | null = null;
  
  showPolicyForm = false;
  editingPolicyId: number | null = null;

  showDeviceForm = false;
  editingDeviceId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    // ─── Shift Form Config ──────────────────────────────────────────────────
    this.shiftForm = this.fb.group({
      name: ['', Validators.required],
      type: ['FIXED', Validators.required],
      start_time: ['09:00', Validators.required],
      end_time: ['18:00', Validators.required],
      grace_period_minutes: [15, [Validators.required, Validators.min(0)]],
      min_work_minutes: [480, [Validators.required, Validators.min(0)]],
      overtime_threshold_minutes: [480, [Validators.required, Validators.min(0)]],
      late_threshold_minutes: [30, [Validators.required, Validators.min(0)]],
      half_day_threshold_minutes: [240, [Validators.required, Validators.min(0)]],
      allowed_break_minutes: [60, [Validators.required, Validators.min(0)]],
      weekend_days: [[0, 6]] // Saturday & Sunday default indices
    });

    // ─── Shift Assign Form Config ───────────────────────────────────────────
    this.shiftAssignForm = this.fb.group({
      employee_ids: [[], Validators.required],
      shift_id: ['', Validators.required],
      effective_from: ['', Validators.required],
      effective_to: ['']
    });

    // ─── Break Policy Form Config ───────────────────────────────────────────
    this.policyForm = this.fb.group({
      name: ['', Validators.required],
      break_type: ['PERSONAL', Validators.required],
      max_duration_minutes: [60, [Validators.required, Validators.min(1)]],
      max_frequency: [3, [Validators.required, Validators.min(1)]],
      allow_split: [true],
      is_paid: [false],
      warning_threshold: [15, Validators.required],
      deduction_threshold: [30, Validators.required],
      half_day_threshold: [60, Validators.required],
      hr_review_threshold: [120, Validators.required]
    });

    // ─── Biometric Device Form Config ───────────────────────────────────────
    this.deviceForm = this.fb.group({
      device_name: ['', Validators.required],
      device_serial: ['', Validators.required],
      device_type: ['FINGERPRINT', Validators.required],
      ip_address: [''],
      location: [''],
      firmware_version: ['1.0.0'],
      min_confidence_score: [0.85, [Validators.required, Validators.min(0), Validators.max(1)]],
      is_whitelisted: [true]
    });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loading = true;
    
    // Load employee list for bulk shift assign dropdown
    this.commonService.getApi('employees').subscribe({
      next: (res: any) => {
        this.employeesList = res?.data || [];
        this.cdr.detectChanges();
      }
    });

    this.loadShifts();
    this.loadPolicies();
    this.loadDevices();
    this.loadAuthLogs();
  }

  // ─── Tab Switch Callback ────────────────────────────────────────────────
  onTabChange(event: any) {
    this.activeTab = event.index;
    if (this.activeTab === 0) this.loadShifts();
    else if (this.activeTab === 1) this.loadPolicies();
    else if (this.activeTab === 2) {
      this.loadDevices();
      this.loadAuthLogs();
    }
  }

  // ─── Shift Operations ───────────────────────────────────────────────────
  loadShifts() {
    this.commonService.getApi('shifts').subscribe({
      next: (res: any) => {
        this.shiftsList = (res?.data || []).map((s: any) => ({
          ...s,
          timings: `${s.start_time} - ${s.end_time}`
        }));
        this.cdr.detectChanges();
      }
    });
  }

  createShift() {
    this.showShiftForm = true;
    this.editingShiftId = null;
    this.shiftForm.reset({
      type: 'FIXED',
      start_time: '09:00',
      end_time: '18:00',
      grace_period_minutes: 15,
      min_work_minutes: 480,
      overtime_threshold_minutes: 480,
      late_threshold_minutes: 30,
      half_day_threshold_minutes: 240,
      allowed_break_minutes: 60,
      weekend_days: [0, 6]
    });
  }

  editShift(shift: any) {
    this.showShiftForm = true;
    this.editingShiftId = shift.id;
    this.shiftForm.patchValue(shift);
  }

  deleteShift(shift: any) {
    this.alert.confirm(`Delete shift pattern "${shift.name}"?`).then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`shifts/${shift.id}`).subscribe({
          next: () => {
            this.alert.success('Shift pattern deleted');
            this.loadShifts();
          },
          error: (err) => this.alert.error(err.error?.message || 'Delete operation failed')
        });
      }
    });
  }

  submitShift() {
    if (this.shiftForm.invalid) return;
    const payload = this.shiftForm.getRawValue();

    if (this.editingShiftId) {
      this.commonService.putApi(`shifts/${this.editingShiftId}`, payload).subscribe({
        next: () => {
          this.alert.success('Shift updated successfully');
          this.showShiftForm = false;
          this.loadShifts();
        }
      });
    } else {
      this.commonService.postApi('shifts', payload).subscribe({
        next: () => {
          this.alert.success('Shift pattern created');
          this.showShiftForm = false;
          this.loadShifts();
        }
      });
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

  submitShiftAssign() {
    if (this.shiftAssignForm.invalid) return;
    const raw = this.shiftAssignForm.getRawValue();
    const payload = {
      ...raw,
      effective_from: this.formatDateForBackend(raw.effective_from)
    };
    
    this.commonService.postApi('shifts/assign', payload).subscribe({
      next: () => {
        this.alert.success('Shifts assigned successfully to selected employees');
        this.shiftAssignForm.reset();
      },
      error: (err) => this.alert.error(err.error?.message || 'Assignment failed')
    });
  }

  // ─── Break Policy Operations ────────────────────────────────────────────
  loadPolicies() {
    this.commonService.getApi('break-policies').subscribe({
      next: (res: any) => {
        this.policiesList = res?.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  createPolicy() {
    this.showPolicyForm = true;
    this.editingPolicyId = null;
    this.policyForm.reset({
      break_type: 'PERSONAL',
      max_duration_minutes: 60,
      max_frequency: 3,
      allow_split: true,
      is_paid: false,
      warning_threshold: 15,
      deduction_threshold: 30,
      half_day_threshold: 60,
      hr_review_threshold: 120
    });
  }

  editPolicy(policy: any) {
    this.showPolicyForm = true;
    this.editingPolicyId = policy.id;
    this.policyForm.patchValue({
      name: policy.name,
      break_type: policy.break_type,
      max_duration_minutes: policy.max_duration_minutes,
      max_frequency: policy.max_frequency,
      allow_split: policy.allow_split,
      is_paid: policy.is_paid,
      warning_threshold: policy.deduction_rules?.warning || 15,
      deduction_threshold: policy.deduction_rules?.salary_deduction || 30,
      half_day_threshold: policy.deduction_rules?.half_day || 60,
      hr_review_threshold: policy.deduction_rules?.hr_review || 120
    });
  }

  deletePolicy(policy: any) {
    this.alert.confirm(`Delete break policy "${policy.name}"?`).then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`break-policies/${policy.id}`).subscribe({
          next: () => {
            this.alert.success('Break policy deleted');
            this.loadPolicies();
          },
          error: (err) => this.alert.error(err.error?.message || 'Delete operation failed')
        });
      }
    });
  }

  submitPolicy() {
    if (this.policyForm.invalid) return;
    const raw = this.policyForm.getRawValue();
    const payload = {
      name: raw.name,
      break_type: raw.break_type,
      max_duration_minutes: raw.max_duration_minutes,
      max_frequency: raw.max_frequency,
      allow_split: raw.allow_split,
      is_paid: raw.is_paid,
      deduction_rules: {
        warning: raw.warning_threshold,
        salary_deduction: raw.deduction_threshold,
        half_day: raw.half_day_threshold,
        hr_review: raw.hr_review_threshold
      }
    };

    if (this.editingPolicyId) {
      this.commonService.putApi(`break-policies/${this.editingPolicyId}`, payload).subscribe({
        next: () => {
          this.alert.success('Break policy updated');
          this.showPolicyForm = false;
          this.loadPolicies();
        }
      });
    } else {
      this.commonService.postApi('break-policies', payload).subscribe({
        next: () => {
          this.alert.success('Break policy created');
          this.showPolicyForm = false;
          this.loadPolicies();
        }
      });
    }
  }

  // ─── Biometric Devices Operations ───────────────────────────────────────
  loadDevices() {
    this.commonService.getApi('biometric/device').subscribe({
      next: (res: any) => {
        this.devicesList = res?.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  loadAuthLogs() {
    this.commonService.getApi('biometric/logs').subscribe({
      next: (res: any) => {
        this.authLogsList = (res?.data || []).map((l: any) => {
          const emp = this.employeesList.find(e => e.id === l.employee_id);
          return {
            ...l,
            employee_id: emp ? emp.name : `Employee ID: ${l.employee_id}`
          };
        });
        this.cdr.detectChanges();
      }
    });
  }

  createDevice() {
    this.showDeviceForm = true;
    this.editingDeviceId = null;
    this.deviceForm.reset({
      device_type: 'FINGERPRINT',
      min_confidence_score: 0.85,
      is_whitelisted: true,
      firmware_version: '1.0.0'
    });
  }

  editDevice(device: any) {
    this.showDeviceForm = true;
    this.editingDeviceId = device.id;
    this.deviceForm.patchValue(device);
  }

  deleteDevice(device: any) {
    this.alert.confirm(`Remove biometric device "${device.device_name}"?`).then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`biometric/device/${device.id}`).subscribe({
          next: () => {
            this.alert.success('Biometric device removed');
            this.loadDevices();
          },
          error: (err) => this.alert.error(err.error?.message || 'Delete operation failed')
        });
      }
    });
  }

  submitDevice() {
    if (this.deviceForm.invalid) return;
    const payload = this.deviceForm.getRawValue();

    if (this.editingDeviceId) {
      this.commonService.putApi(`biometric/device/${this.editingDeviceId}`, payload).subscribe({
        next: () => {
          this.alert.success('Device configurations updated');
          this.showDeviceForm = false;
          this.loadDevices();
        }
      });
    } else {
      this.commonService.postApi('biometric/device/register', payload).subscribe({
        next: (res: any) => {
          this.alert.success(`Device registered! Secret Key: ${res?.data?.device_secret || 'Signed JWT'}`);
          this.showDeviceForm = false;
          this.loadDevices();
        }
      });
    }
  }
}
