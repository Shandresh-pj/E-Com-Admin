import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

@Component({
  selector: 'app-workforce',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    TablerIconsModule,
    MatTable,
    AppTranslatePipe
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
      grace_period_minutes: [15, Validators.required],
      min_work_minutes: [480, Validators.required],
      overtime_threshold_minutes: [480],
      late_threshold_minutes: [15],
      half_day_threshold_minutes: [240],
      allowed_break_minutes: [60],
      weekend_days: [[0, 6]]
    });

    // ─── Shift Assignment Form ──────────────────────────────────────────────
    this.shiftAssignForm = this.fb.group({
      employee_ids: [[], Validators.required],
      shift_id: ['', Validators.required],
      effective_from: [new Date(), Validators.required],
      effective_to: ['']
    });

    // ─── Break Policy Form Config ────────────────────────────────────────────
    this.policyForm = this.fb.group({
      name: ['', Validators.required],
      break_type: ['PERSONAL', Validators.required],
      max_duration_minutes: [60, Validators.required],
      max_frequency: [2, Validators.required],
      warning_threshold: [15],
      deduction_threshold: [30],
      half_day_threshold: [60],
      hr_review_threshold: [120],
      allow_split: [true],
      is_paid: [false]
    });

    // ─── Biometric Device Form Config ────────────────────────────────────────
    this.deviceForm = this.fb.group({
      device_name: ['', Validators.required],
      device_serial: ['', Validators.required],
      device_type: ['FINGERPRINT', Validators.required],
      ip_address: [''],
      location: ['Main Entrance'],
      min_confidence_score: [85, Validators.required],
      is_whitelisted: [true]
    });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  onTabChange(event: any) {
    this.activeTab = event ? event.index : 0;
  }

  loadInitialData() {
    this.loading = true;
    this.loadShifts();
    this.loadPolicies();
    this.loadDevices();
    this.loadLogs();
    this.loadEmployees();
  }

  loadShifts() {
    this.commonService.getApi('shifts').subscribe({
      next: (res: any) => {
        this.shiftsList = (res?.data || []).map((s: any) => ({
          ...s,
          timings: `${s.start_time} - ${s.end_time}`
        }));
        this.cdr.markForCheck();
      }
    });
  }

  loadPolicies() {
    this.commonService.getApi('break-policies').subscribe({
      next: (res: any) => {
        this.policiesList = res?.data || [];
        this.cdr.markForCheck();
      }
    });
  }

  loadDevices() {
    this.commonService.getApi('biometric/device').subscribe({
      next: (res: any) => {
        this.devicesList = res?.data || [];
        this.cdr.markForCheck();
      }
    });
  }

  loadLogs() {
    this.commonService.getApi('biometric/logs').subscribe({
      next: (res: any) => {
        this.authLogsList = res?.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadEmployees() {
    this.commonService.getApi('employees').subscribe({
      next: (res: any) => {
        this.employeesList = res?.data || [];
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Shift Actions ────────────────────────────────────────────────────────
  createShift() {
    this.toggleShiftForm();
  }

  toggleShiftForm() {
    this.showShiftForm = !this.showShiftForm;
    if (!this.showShiftForm) {
      this.editingShiftId = null;
      this.shiftForm.reset({
        type: 'FIXED',
        start_time: '09:00',
        end_time: '18:00',
        grace_period_minutes: 15,
        min_work_minutes: 480,
        weekend_days: [0, 6]
      });
    }
  }

  submitShift() {
    this.saveShift();
  }

  saveShift() {
    if (this.shiftForm.invalid) return;
    this.loading = true;
    const body = this.shiftForm.value;

    const req$ = this.editingShiftId
      ? this.commonService.putApi(`shifts/${this.editingShiftId}`, body)
      : this.commonService.postApi('shifts', body);

    req$.subscribe({
      next: (res: any) => {
        this.loading = false;
        this.alert.success(res?.message || 'Shift saved successfully');
        this.toggleShiftForm();
        this.loadShifts();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Failed to save shift');
      }
    });
  }

  editShift(shift: any) {
    this.editingShiftId = shift.id;
    this.shiftForm.patchValue(shift);
    this.showShiftForm = true;
  }

  deleteShift(shift: any) {
    if (!confirm(`Are you sure you want to delete shift ${shift.name}?`)) return;
    this.commonService.deleteApi(`shifts/${shift.id}`).subscribe({
      next: () => {
        this.alert.success('Shift deleted successfully');
        this.loadShifts();
      }
    });
  }

  submitShiftAssign() {
    this.assignShift();
  }

  assignShift() {
    if (this.shiftAssignForm.invalid) return;
    this.loading = true;
    const val = this.shiftAssignForm.value;
    const payload = {
      ...val,
      effective_from: val.effective_from instanceof Date ? val.effective_from.toISOString().split('T')[0] : (val.effective_from || new Date().toISOString().split('T')[0]),
      effective_to: val.effective_to instanceof Date ? val.effective_to.toISOString().split('T')[0] : (val.effective_to || undefined)
    };

    this.commonService.postApi('shifts/assign', payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.alert.success(res?.message || 'Shift assigned to employees successfully');
        this.shiftAssignForm.reset({ effective_from: new Date() });
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Shift assignment failed');
      }
    });
  }

  // ─── Break Policy Actions ─────────────────────────────────────────────────
  createPolicy() {
    this.togglePolicyForm();
  }

  togglePolicyForm() {
    this.showPolicyForm = !this.showPolicyForm;
    if (!this.showPolicyForm) {
      this.editingPolicyId = null;
      this.policyForm.reset({
        break_type: 'PERSONAL',
        max_duration_minutes: 60,
        max_frequency: 2,
        warning_threshold: 15,
        deduction_threshold: 30,
        half_day_threshold: 60,
        hr_review_threshold: 120,
        allow_split: true,
        is_paid: false
      });
    }
  }

  submitPolicy() {
    this.savePolicy();
  }

  savePolicy() {
    if (this.policyForm.invalid) return;
    this.loading = true;
    const body = this.policyForm.value;

    const req$ = this.editingPolicyId
      ? this.commonService.putApi(`break-policies/${this.editingPolicyId}`, body)
      : this.commonService.postApi('break-policies', body);

    req$.subscribe({
      next: (res: any) => {
        this.loading = false;
        this.alert.success(res?.message || 'Break policy saved successfully');
        this.togglePolicyForm();
        this.loadPolicies();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Failed to save break policy');
      }
    });
  }

  editPolicy(policy: any) {
    this.editingPolicyId = policy.id;
    this.policyForm.patchValue(policy);
    this.showPolicyForm = true;
  }

  deletePolicy(policy: any) {
    if (!confirm(`Are you sure you want to delete policy ${policy.name}?`)) return;
    this.commonService.deleteApi(`break-policies/${policy.id}`).subscribe({
      next: () => {
        this.alert.success('Break policy deleted successfully');
        this.loadPolicies();
      }
    });
  }

  // ─── Biometric Device Actions ──────────────────────────────────────────────
  createDevice() {
    this.toggleDeviceForm();
  }

  toggleDeviceForm() {
    this.showDeviceForm = !this.showDeviceForm;
    if (!this.showDeviceForm) {
      this.editingDeviceId = null;
      this.deviceForm.reset({
        device_type: 'FINGERPRINT',
        location: 'Main Entrance',
        min_confidence_score: 85,
        is_whitelisted: true
      });
    }
  }

  submitDevice() {
    this.saveDevice();
  }

  saveDevice() {
    if (this.deviceForm.invalid) return;
    this.loading = true;
    const body = this.deviceForm.value;

    const req$ = this.editingDeviceId
      ? this.commonService.putApi(`biometric/device/${this.editingDeviceId}`, body)
      : this.commonService.postApi('biometric/device/register', body);

    req$.subscribe({
      next: (res: any) => {
        this.loading = false;
        this.alert.success(res?.message || 'Device registered successfully');
        this.toggleDeviceForm();
        this.loadDevices();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error(err?.error?.message || 'Device registration failed');
      }
    });
  }

  editDevice(device: any) {
    this.editingDeviceId = device.id;
    this.deviceForm.patchValue(device);
    this.showDeviceForm = true;
  }

  toggleWhitelist(device: any) {
    const nextStatus = !device.is_whitelisted;
    this.commonService.putApi(`biometric/device/${device.id}`, { is_whitelisted: nextStatus }).subscribe({
      next: () => {
        this.alert.success(`Device ${nextStatus ? 'Whitelisted' : 'Blacklisted'} successfully`);
        this.loadDevices();
      }
    });
  }

  deleteDevice(device: any) {
    if (!confirm(`Are you sure you want to remove device ${device.device_name}?`)) return;
    this.commonService.deleteApi(`biometric/device/${device.id}`).subscribe({
      next: () => {
        this.alert.success('Device removed successfully');
        this.loadDevices();
      }
    });
  }
}
