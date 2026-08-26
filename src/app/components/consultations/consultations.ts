import {
  Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablerIconsModule } from 'angular-tabler-icons';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { Consultation } from 'src/app/models/healthcare.models';
import { formatDateDDMMYYYY, parseDateFromDDMMYYYY } from 'src/app/utils/date-utils';

@Component({
  selector: 'app-consultations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule,
    MatTooltipModule, TablerIconsModule,
  ],
  templateUrl: './consultations.html',
  styleUrl: './consultations.scss',
})
export class ConsultationsComponent implements OnInit {
  consultations        = signal<Consultation[]>([]);
  loading              = signal(false);
  saving               = signal(false);
  showForm             = signal(false);
  editingId            = signal<number | null>(null);
  searchQuery          = signal('');
  viewMode             = signal<'grid' | 'list'>('grid');
  selectedConsultation = signal<Consultation | null>(null);
  formValues           = signal<any>({});

  appointments: any[] = [];
  doctors:      any[] = [];
  patients:     any[] = [];

  filteredConsultations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.consultations().filter(c =>
      !q ||
      (c.patient_name || '').toLowerCase().includes(q) ||
      (c.doctor_name  || '').toLowerCase().includes(q) ||
      (c.diagnosis    || '').toLowerCase().includes(q) ||
      (c.chief_complaint || '').toLowerCase().includes(q)
    );
  });

  prescriptionCount = computed(() => this.consultations().filter(c => c.prescription_id).length);
  followUpCount     = computed(() => this.consultations().filter(c => c.follow_up_date).length);
  diagnosisCount    = computed(() => this.consultations().filter(c => c.diagnosis && c.diagnosis.trim().length > 0).length);

  form!: FormGroup;

  constructor(
    private fb:     FormBuilder,
    private common: CommonService,
    private alert:  AlertService,
    public  perm:   PermissionService,
    public  cdr:    ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.load();
    this.loadLookups();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      appointment_id:  [''],
      patient_id:      ['', Validators.required],
      doctor_id:       ['', Validators.required],
      chief_complaint: ['', Validators.required],
      diagnosis:       [''],
      notes:           [''],
      follow_up_date:  [''],
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
    if (!name) return 'CS';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.cdr.markForCheck();
  }

  viewConsultDetails(c: Consultation, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedConsultation.set(c);
    this.cdr.markForCheck();
  }

  closeConsultDetails(): void {
    this.selectedConsultation.set(null);
    this.cdr.markForCheck();
  }

  load(): void {
    this.loading.set(true);
    this.common.getApi('consultations').subscribe({
      next:  (r: any) => { this.consultations.set(r?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()       => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  private loadLookups(): void {
    this.common.getApi('doctors?is_active=true').subscribe({ next: (r: any) => { this.doctors = r?.data || []; this.cdr.markForCheck(); } });
    this.common.getApi('patients').subscribe({ next: (r: any) => { this.patients = r?.data || []; this.cdr.markForCheck(); } });
    this.common.getApi('appointments?status=IN_CONSULTATION').subscribe({ next: (r: any) => { this.appointments = r?.data || []; this.cdr.markForCheck(); } });
  }

  openForm(c?: Consultation): void {
    if (c) {
      this.editingId.set(c.id);
      this.form.patchValue({
        ...c,
        follow_up_date: parseDateFromDDMMYYYY(c.follow_up_date)
      });
    } else {
      this.editingId.set(null);
      this.form.reset();
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = {
      ...this.form.value,
      follow_up_date: formatDateDDMMYYYY(this.form.value.follow_up_date)
    };
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`consultations/${id}`, payload)
      : this.common.postApi('consultations', payload);
    req$.subscribe({
      next: () => { this.alert.success('Consultation saved'); this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => { this.alert.error(e?.error?.message || 'Failed'); this.saving.set(false); this.cdr.markForCheck(); },
    });
  }
}
