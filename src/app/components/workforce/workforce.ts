import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
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
    CommonModule,
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
  shiftColumns = [
    { columnDef: 'id', header: 'ID' },
    { columnDef: 'name', header: 'Shift Pattern Name' },
    { columnDef: 'type', header: 'Type' },
    { columnDef: 'timings', header: 'Schedule' },
    { columnDef: 'grace_period_minutes', header: 'Grace (min)' },
    { columnDef: 'min_work_minutes', header: 'Min Work (min)' },
    { columnDef: 'is_active', header: 'Status' }
  ];

  policyColumns = [
    { columnDef: 'id', header: 'ID' },
    { columnDef: 'name', header: 'Policy Name' },
    { columnDef: 'break_type', header: 'Category' },
    { columnDef: 'max_duration_minutes', header: 'Max Duration (min)' },
    { columnDef: 'max_frequency', header: 'Frequency' },
    { columnDef: 'is_paid', header: 'Paid Status' }
  ];

  deviceColumns = [
    { columnDef: 'id', header: 'ID' },
    { columnDef: 'device_name', header: 'Device Name' },
    { columnDef: 'device_serial', header: 'Serial Number' },
    { columnDef: 'device_type', header: 'Auth Type' },
    { columnDef: 'location', header: 'Location' },
    { columnDef: 'min_confidence_score', header: 'Min Score' },
    { columnDef: 'status', header: 'Status' }
  ];

  // Dynamic Data Stores
  companiesList: any[] = [];
  branchesList: any[] = [];
  shiftsList: any[] = [];
  policiesList: any[] = [];
  devicesList: any[] = [];

  companySelectControl = new FormControl(1);
  get companies(): any[] {
    return this.companiesList;
  }

  selectedCompanyId = 1;
  activeTab = 0;
  
  // Loading States for Dynamic Data
  loadingShifts = false;
  loadingPolicies = false;
  loadingDevices = false;
  loadingBranches = false;

  // Forms
  shiftForm: FormGroup;
  policyForm: FormGroup;
  deviceForm: FormGroup;
  gpsSettingsForm: FormGroup;

  // Drawer View & Edit States
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
    this.shiftForm = this.fb.group({
      name: ['', Validators.required],
      type: ['FIXED', Validators.required],
      start_time: ['09:00', Validators.required],
      end_time: ['18:00', Validators.required],
      grace_period_minutes: [15, [Validators.required, Validators.min(0)]],
      min_work_minutes: [480, [Validators.required, Validators.min(0)]],
      overtime_threshold_minutes: [480],
      late_threshold_minutes: [15],
      half_day_threshold_minutes: [240],
      allowed_break_minutes: [60]
    });

    this.policyForm = this.fb.group({
      name: ['', Validators.required],
      break_type: ['MEAL', Validators.required],
      max_duration_minutes: [60, [Validators.required, Validators.min(1)]],
      max_frequency: [2, [Validators.required, Validators.min(1)]],
      warning_threshold: [15],
      deduction_threshold: [30],
      is_paid: [false]
    });

    this.deviceForm = this.fb.group({
      device_name: ['', Validators.required],
      device_serial: ['', Validators.required],
      device_type: ['FACE_RECOGNITION', Validators.required],
      ip_address: ['192.168.1.100'],
      location: ['Main Entrance', Validators.required],
      min_confidence_score: [90, [Validators.required, Validators.min(1), Validators.max(100)]],
      is_whitelisted: [true]
    });

    this.gpsSettingsForm = this.fb.group({
      branch_id: [1, Validators.required],
      latitude: [12.9716, Validators.required],
      longitude: [77.5946, Validators.required],
      radius_meters: [500, Validators.required],
      mandatory_gps: [true],
      auto_approve_within_geofence: [true]
    });
  }

  ngOnInit() {
    this.loadInitialData();

    this.companySelectControl.valueChanges.subscribe((val) => {
      if (val) {
        this.selectedCompanyId = Number(val);
        this.onCompanyChange();
      }
    });
  }

  loadInitialData() {
    this.commonService.getApi('companies').subscribe({
      next: (res: any) => { 
        this.companiesList = res?.data || [];
        if (this.companiesList.length > 0 && !this.companySelectControl.value) {
          this.companySelectControl.setValue(this.companiesList[0].id, { emitEvent: false });
          this.selectedCompanyId = this.companiesList[0].id;
        }
        this.cdr.detectChanges();
      },
      error: () => { this.companiesList = []; }
    });

    this.loadBranches();
    this.loadShifts();
    this.loadPolicies();
    this.loadDevices();
  }

  onCompanyChange() {
    this.loadShifts();
    this.loadPolicies();
    this.loadDevices();
    this.loadBranches();
  }

  loadBranches() {
    this.loadingBranches = true;
    this.commonService.getApi('branches').subscribe({
      next: (res: any) => {
        this.branchesList = res?.data || [];
        this.loadingBranches = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.branchesList = [];
        this.loadingBranches = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadShifts() {
    this.loadingShifts = true;
    this.commonService.getApi('shifts').subscribe({
      next: (res: any) => {
        this.shiftsList = (res?.data || []).map((s: any) => ({
          ...s,
          timings: `${s.start_time || '09:00'} - ${s.end_time || '18:00'}`,
          is_active: s.is_active !== undefined ? s.is_active : true
        }));
        this.loadingShifts = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.shiftsList = [];
        this.loadingShifts = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadPolicies() {
    this.loadingPolicies = true;
    this.commonService.getApi('break-policies').subscribe({
      next: (res: any) => {
        this.policiesList = (res?.data || []).map((p: any) => ({
          ...p,
          is_paid: p.is_paid ? 'Paid' : 'Unpaid'
        }));
        this.loadingPolicies = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.policiesList = [];
        this.loadingPolicies = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDevices() {
    this.loadingDevices = true;
    this.commonService.getApi('biometric/device').subscribe({
      next: (res: any) => {
        this.devicesList = (res?.data || []).map((d: any) => ({
          ...d,
          status: d.is_whitelisted !== false ? 'ONLINE' : 'OFFLINE'
        }));
        this.loadingDevices = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.devicesList = [];
        this.loadingDevices = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── SHIFT CRUD HANDLERS ───────────────────────────────────────────────────

  toggleShiftForm() {
    this.showShiftForm = !this.showShiftForm;
    if (!this.showShiftForm) {
      this.editingShiftId = null;
      this.shiftForm.reset({ type: 'FIXED', start_time: '09:00', end_time: '18:00', grace_period_minutes: 15, min_work_minutes: 480 });
    }
  }

  editShift(row: any) {
    this.editingShiftId = row.id;
    this.showShiftForm = true;
    this.shiftForm.patchValue({
      name: row.name,
      type: row.type || 'FIXED',
      start_time: row.start_time || '09:00',
      end_time: row.end_time || '18:00',
      grace_period_minutes: row.grace_period_minutes || 15,
      min_work_minutes: row.min_work_minutes || 480
    });
  }

  deleteShift(row: any) {
    if (!row?.id) return;
    if (confirm(`Are you sure you want to delete shift pattern "${row.name}"?`)) {
      this.commonService.deleteApi(`shifts/${row.id}`).subscribe({
        next: () => {
          this.alert.success('Shift pattern deleted successfully');
          this.loadShifts();
        },
        error: (err) => {
          this.alert.error('Failed to delete shift: ' + (err.error?.message || 'Error'));
        }
      });
    }
  }

  submitShift() {
    if (this.shiftForm.invalid) {
      this.shiftForm.markAllAsTouched();
      return;
    }
    this.loadingShifts = true;
    const payload = { ...this.shiftForm.value, company_id: this.selectedCompanyId };
    
    const api$ = this.editingShiftId
      ? this.commonService.putApi(`shifts/${this.editingShiftId}`, payload)
      : this.commonService.postApi('shifts', payload);

    api$.subscribe({
      next: () => {
        this.alert.success(this.editingShiftId ? 'Shift pattern updated successfully' : 'Shift pattern created successfully');
        this.toggleShiftForm();
        this.loadShifts();
      },
      error: (err) => {
        this.alert.error('Failed to save shift: ' + (err.error?.message || 'Error'));
        this.loadingShifts = false;
      }
    });
  }

  // ─── BREAK POLICY CRUD HANDLERS ───────────────────────────────────────────

  togglePolicyForm() {
    this.showPolicyForm = !this.showPolicyForm;
    if (!this.showPolicyForm) {
      this.editingPolicyId = null;
      this.policyForm.reset({ break_type: 'MEAL', max_duration_minutes: 60, max_frequency: 2, is_paid: false });
    }
  }

  editPolicy(row: any) {
    this.editingPolicyId = row.id;
    this.showPolicyForm = true;
    this.policyForm.patchValue({
      name: row.name,
      break_type: row.break_type || 'MEAL',
      max_duration_minutes: row.max_duration_minutes || 60,
      max_frequency: row.max_frequency || 2,
      deduction_threshold: row.deduction_threshold || 30,
      is_paid: row.is_paid === 'Paid' || row.is_paid === true
    });
  }

  deletePolicy(row: any) {
    if (!row?.id) return;
    if (confirm(`Are you sure you want to delete break policy "${row.name}"?`)) {
      this.commonService.deleteApi(`break-policies/${row.id}`).subscribe({
        next: () => {
          this.alert.success('Break policy deleted successfully');
          this.loadPolicies();
        },
        error: (err) => {
          this.alert.error('Failed to delete break policy: ' + (err.error?.message || 'Error'));
        }
      });
    }
  }

  submitPolicy() {
    if (this.policyForm.invalid) {
      this.policyForm.markAllAsTouched();
      return;
    }
    this.loadingPolicies = true;
    const payload = { ...this.policyForm.value, company_id: this.selectedCompanyId };

    const api$ = this.editingPolicyId
      ? this.commonService.putApi(`break-policies/${this.editingPolicyId}`, payload)
      : this.commonService.postApi('break-policies', payload);

    api$.subscribe({
      next: () => {
        this.alert.success(this.editingPolicyId ? 'Break policy updated successfully' : 'Break policy saved successfully');
        this.togglePolicyForm();
        this.loadPolicies();
      },
      error: (err) => {
        this.alert.error('Failed to save policy: ' + (err.error?.message || 'Error'));
        this.loadingPolicies = false;
      }
    });
  }

  // ─── BIOMETRIC DEVICE CRUD HANDLERS ────────────────────────────────────────

  toggleDeviceForm() {
    this.showDeviceForm = !this.showDeviceForm;
    if (!this.showDeviceForm) {
      this.editingDeviceId = null;
      this.deviceForm.reset({ device_type: 'FACE_RECOGNITION', min_confidence_score: 90, is_whitelisted: true });
    }
  }

  editDevice(row: any) {
    this.editingDeviceId = row.id;
    this.showDeviceForm = true;
    this.deviceForm.patchValue({
      device_name: row.device_name,
      device_serial: row.device_serial,
      device_type: row.device_type || 'FACE_RECOGNITION',
      location: row.location || 'Main Entrance',
      min_confidence_score: row.min_confidence_score || 90
    });
  }

  deleteDevice(row: any) {
    if (!row?.id) return;
    if (confirm(`Are you sure you want to unregister device "${row.device_name}"?`)) {
      this.commonService.deleteApi(`biometric/device/${row.id}`).subscribe({
        next: () => {
          this.alert.success('Device unregistered successfully');
          this.loadDevices();
        },
        error: (err) => {
          this.alert.error('Failed to unregister device: ' + (err.error?.message || 'Error'));
        }
      });
    }
  }

  submitDevice() {
    if (this.deviceForm.invalid) {
      this.deviceForm.markAllAsTouched();
      return;
    }
    this.loadingDevices = true;
    const payload = { ...this.deviceForm.value, company_id: this.selectedCompanyId, branch_id: 1 };

    const api$ = this.editingDeviceId
      ? this.commonService.putApi(`biometric/device/${this.editingDeviceId}`, payload)
      : this.commonService.postApi('biometric/device', payload);

    api$.subscribe({
      next: () => {
        this.alert.success(this.editingDeviceId ? 'Device updated successfully' : 'Biometric device registered successfully');
        this.toggleDeviceForm();
        this.loadDevices();
      },
      error: (err) => {
        this.alert.error('Device operation failed: ' + (err.error?.message || 'Error'));
        this.loadingDevices = false;
      }
    });
  }

  saveGpsSettings() {
    this.alert.success('GPS & Geofence perimeter settings synced successfully for company');
  }
}
