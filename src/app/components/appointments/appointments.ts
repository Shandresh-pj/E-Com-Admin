import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
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
import { formatDateDDMMYYYY, parseDateFromDDMMYYYY } from 'src/app/utils/date-utils';

@Component({
  selector: 'app-appointments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule, TablerIconsModule
  ],
  templateUrl: './appointments.html',
  styleUrl: './appointments.scss',
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  appointments        = signal<Appointment[]>([]);
  loading             = signal(false);
  saving              = signal(false);
  showForm            = signal(false);
  editingId           = signal<number | null>(null);
  searchQuery         = signal('');
  statusFilter        = signal('');
  viewMode            = signal<'grid' | 'list'>('grid');
  selectedAppt        = signal<Appointment | null>(null);
  formValues          = signal<any>({});
  copiedCode          = signal<string | null>(null);

  doctors:  any[] = [];
  patients: any[] = [];

  filteredAppointments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sf = this.statusFilter();
    return this.appointments().filter(a =>
      (!sf || a.status === sf) &&
      (!q  ||
        (a.patient_name || '').toLowerCase().includes(q) ||
        (a.doctor_name  || '').toLowerCase().includes(q) ||
        (a.appointment_code || '').toLowerCase().includes(q)
      )
    );
  });

  readonly statusList    = Object.values(AppointmentStatus);
  readonly statusOptions = Object.values(AppointmentStatus);
  readonly statusMeta    = APPOINTMENT_STATUS_META;
  readonly StatusEnum    = AppointmentStatus;
  readonly ApptStatus    = AppointmentStatus;

  confirmedCount    = computed(() => this.appointments().filter(a => a.status === AppointmentStatus.CONFIRMED).length);
  checkedInCount    = computed(() => this.appointments().filter(a => a.status === AppointmentStatus.CHECKED_IN).length);
  inConsultCount    = computed(() => this.appointments().filter(a => a.status === AppointmentStatus.IN_CONSULTATION).length);
  completedCount    = computed(() => this.appointments().filter(a => a.status === AppointmentStatus.COMPLETED).length);
  cancelledCount    = computed(() => this.appointments().filter(a => a.status === AppointmentStatus.CANCELLED).length);

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

    this.subs.add(this.socket.on(HcEventType.APPOINTMENT_CREATED).subscribe(() => this.loadAppointments()));
    this.subs.add(this.socket.on(HcEventType.APPOINTMENT_UPDATED).subscribe(() => this.loadAppointments()));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private buildForm(): void {
    this.form = this.fb.group({
      patient_id:       ['', Validators.required],
      doctor_id:        ['', Validators.required],
      appointment_date: [new Date(), Validators.required],
      appointment_time: ['09:00', Validators.required],
      chief_complaint:  [''],
      consultation_fee: [500, [Validators.required, Validators.min(0)]],
      status:           [AppointmentStatus.CONFIRMED, Validators.required],
      notes:            [''],
    });

    this.form.valueChanges.subscribe(val => {
      this.formValues.set({
        ...val,
        patient_name: this.getPatientName(val.patient_id),
        doctor_name: this.getDoctorName(val.doctor_id)
      });
      this.cdr.markForCheck();
    });
  }

  getPatientName(id: any): string {
    const p = this.patients.find(x => String(x.id) === String(id));
    return p ? p.name : '';
  }

  getDoctorName(id: any): string {
    const d = this.doctors.find(x => String(x.id) === String(id));
    return d ? d.name : '';
  }

  getInitials(name: string): string {
    if (!name) return 'AP';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  copyApptCode(code: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    this.copiedCode.set(code);
    this.alert.success(`Copied code ${code} to clipboard`);
    setTimeout(() => this.copiedCode.set(null), 2000);
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.cdr.markForCheck();
  }

  selectStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.cdr.markForCheck();
  }

  viewApptDetails(appt: Appointment, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedAppt.set(appt);
    this.cdr.markForCheck();
  }

  closeApptDetails(): void {
    this.selectedAppt.set(null);
    this.cdr.markForCheck();
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
      this.form.patchValue({
        ...appt,
        appointment_date: parseDateFromDDMMYYYY(appt.appointment_date)
      });
    } else {
      this.editingId.set(null);
      this.form.reset({ consultation_fee: 0, appointment_date: new Date() });
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  saveAppointment(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = {
      ...this.form.value,
      appointment_date: formatDateDDMMYYYY(this.form.value.appointment_date)
    };
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`appointments/${id}`, payload)
      : this.common.postApi('appointments', payload);

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
