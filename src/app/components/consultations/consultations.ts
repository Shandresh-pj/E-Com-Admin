import {
  Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, signal
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
import { TablerIconsModule } from 'angular-tabler-icons';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { Consultation } from 'src/app/models/healthcare.models';

@Component({
  selector: 'app-consultations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule, TablerIconsModule,
  ],
  templateUrl: './consultations.html',
  styleUrl: './consultations.scss',
})
export class ConsultationsComponent implements OnInit {
  consultations = signal<Consultation[]>([]);
  loading       = signal(false);
  saving        = signal(false);
  showForm      = signal(false);
  editingId     = signal<number | null>(null);
  searchQuery   = '';

  appointments: any[] = [];
  doctors:      any[] = [];
  patients:     any[] = [];

  filteredConsultations = () => {
    const q = this.searchQuery.toLowerCase();
    return this.consultations().filter(c =>
      !q ||
      (c.patient_name || '').toLowerCase().includes(q) ||
      (c.doctor_name  || '').toLowerCase().includes(q) ||
      (c.diagnosis    || '').toLowerCase().includes(q)
    );
  };

  get prescriptionCount(): number {
    return this.consultations().filter(c => c.prescription_id).length;
  }

  get followUpCount(): number {
    return this.consultations().filter(c => c.follow_up_date).length;
  }

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
    if (c) { this.editingId.set(c.id); this.form.patchValue(c); }
    else   { this.editingId.set(null); this.form.reset(); }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`consultations/${id}`, this.form.value)
      : this.common.postApi('consultations', this.form.value);
    req$.subscribe({
      next: () => { this.alert.success('Consultation saved'); this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => { this.alert.error(e?.error?.message || 'Failed'); this.saving.set(false); this.cdr.markForCheck(); },
    });
  }
}
