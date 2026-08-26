import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import {
  Appointment, AppointmentStatus, PaymentStatus,
  APPOINTMENT_STATUS_META, HcEventType
} from 'src/app/models/healthcare.models';

@Component({
  selector: 'app-appointments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule,
    MatProgressSpinnerModule, TablerIconsModule,
  ],
  templateUrl: './appointments.html',
  styleUrl: './appointments.scss',
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  appointments = signal<Appointment[]>([]);
  loading      = signal(false);
  saving       = signal(false);
  showForm     = signal(false);
  editingId    = signal<number | null>(null);
  searchQuery  = '';
  statusFilter = '';

  doctors:  any[] = [];
  patients: any[] = [];

  filteredAppointments = () => {
    const q = this.searchQuery.toLowerCase();
    const sf = this.statusFilter;
    return this.appointments().filter(a =>
      (!sf || a.status === sf) &&
      (!q || (a.patient_name || '').toLowerCase().includes(q) || (a.doctor_name || '').toLowerCase().includes(q))
    );
  };

  readonly statusOptions = Object.values(AppointmentStatus);
  readonly statusMeta    = APPOINTMENT_STATUS_META;
  readonly paymentStatusOptions = Object.values(PaymentStatus);

  /** Expose enum to template — avoids raw string literals that fail strict type checking */
  readonly ApptStatus = AppointmentStatus;

  form!: FormGroup;
  private subs = new Subscription();

  constructor(
    private fb:     FormBuilder,
    private common: CommonService,
    private alert:  AlertService,
    public  perm:   PermissionService,
    private socket: SocketService,
    public  cdr:    ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadAppointments();
    this.loadDoctors();
    this.loadPatients();
    this.subs.add(
      this.socket.on(HcEventType.APPOINTMENT_CREATED).subscribe(() => this.loadAppointments())
    );
    this.subs.add(
      this.socket.on(HcEventType.APPOINTMENT_UPDATED).subscribe(() => this.loadAppointments())
    );
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private buildForm(): void {
    this.form = this.fb.group({
      patient_id:       ['', Validators.required],
      doctor_id:        ['', Validators.required],
      appointment_date: ['', Validators.required],
      appointment_time: ['', Validators.required],
      consultation_fee: [0, [Validators.required, Validators.min(0)]],
      notes:            [''],
    });
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.common.getApi('appointments').subscribe({
      next:  (res: any) => { this.appointments.set(res?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()         => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  private loadDoctors(): void {
    this.common.getApi('doctors?is_active=true').subscribe({
      next: (r: any) => { this.doctors = r?.data || []; this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  private loadPatients(): void {
    this.common.getApi('patients?is_active=true').subscribe({
      next: (r: any) => { this.patients = r?.data || []; this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  openForm(appt?: Appointment): void {
    if (appt) {
      this.editingId.set(appt.id);
      this.form.patchValue(appt);
    } else {
      this.editingId.set(null);
      this.form.reset({ consultation_fee: 0, appointment_date: new Date().toISOString().split('T')[0] });
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  saveAppointment(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`appointments/${id}`, this.form.value)
      : this.common.postApi('appointments', this.form.value);

    req$.subscribe({
      next: () => {
        this.alert.success(id ? 'Appointment updated' : 'Appointment booked successfully');
        this.saving.set(false);
        this.closeForm();
        this.loadAppointments();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to save appointment');
        this.saving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  updateStatus(appt: Appointment, status: AppointmentStatus): void {
    this.common.patchApi(`appointments/${appt.id}/status`, { status }).subscribe({
      next: () => { this.alert.success(`Status updated to ${this.statusMeta[status]?.label}`); this.loadAppointments(); },
      error: (err: any) => this.alert.error(err?.error?.message || 'Failed to update status'),
    });
  }

  cancelAppointment(appt: Appointment): void {
    this.alert.confirm(`Cancel appointment for ${appt.patient_name}?`).then((r: any) => {
      if (r.isConfirmed) this.updateStatus(appt, AppointmentStatus.CANCELLED);
    });
  }


  getStatusClass(status: string): string {
    return this.statusMeta[status as AppointmentStatus]?.cssClass || '';
  }

  getStatusLabel(status: string): string {
    return this.statusMeta[status as AppointmentStatus]?.label || status;
  }

  getKpiCount(status: AppointmentStatus): number {
    return this.appointments().filter(a => a.status === status).length;
  }

  formatFee(fee: number): string {
    return '₹' + (fee || 0).toLocaleString('en-IN');
  }
}
