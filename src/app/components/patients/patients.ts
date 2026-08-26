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
import { MatTabsModule } from '@angular/material/tabs';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Patient } from 'src/app/models/healthcare.models';

@Component({
  selector: 'app-patients',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule,
    MatProgressSpinnerModule, MatTabsModule, TablerIconsModule,
  ],
  templateUrl: './patients.html',
  styleUrl: './patients.scss',
})
export class PatientsComponent implements OnInit, OnDestroy {
  patients    = signal<Patient[]>([]);
  loading     = signal(false);
  saving      = signal(false);
  showForm    = signal(false);
  editingId   = signal<number | null>(null);
  searchQuery = '';
  selectedPatient = signal<Patient | null>(null);

  // History tabs data
  appointmentHistory:  any[] = [];
  prescriptionHistory: any[] = [];
  paymentHistory:      any[] = [];

  filteredPatients = () => {
    const q = this.searchQuery.toLowerCase();
    return this.patients().filter(p =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.patient_code.toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  };

  get maleCount(): number {
    return this.patients().filter(p => p.gender === 'Male').length;
  }

  get femaleCount(): number {
    return this.patients().filter(p => p.gender === 'Female').length;
  }

  get viewingPatient() {
    return this.selectedPatient;
  }

  closeView(): void {
    this.closeProfile();
  }

  form!: FormGroup;
  private subs = new Subscription();

  readonly genderOptions = ['Male', 'Female', 'Other'];
  readonly bloodGroups   = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
    this.loadPatients();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private buildForm(): void {
    this.form = this.fb.group({
      name:          ['', [Validators.required, Validators.minLength(2)]],
      gender:        ['Male', Validators.required],
      date_of_birth: [''],
      phone:         ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{7,15}$/)]],
      email:         ['', [Validators.email]],
      address:       [''],
      blood_group:   [''],
      allergies:     [''],
      notes:         [''],
    });
  }

  loadPatients(): void {
    this.loading.set(true);
    this.common.getApi('patients').subscribe({
      next:  (res: any) => { this.patients.set(res?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()         => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  openForm(patient?: Patient): void {
    if (patient) {
      this.editingId.set(patient.id);
      this.form.patchValue(patient);
    } else {
      this.editingId.set(null);
      this.form.reset({ gender: 'Male' });
    }
    this.showForm.set(true);
    this.selectedPatient.set(null);
  }

  closeForm(): void { this.showForm.set(false); }

  savePatient(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = this.form.value;
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`patients/${id}`, payload)
      : this.common.postApi('patients', payload);

    req$.subscribe({
      next: () => {
        this.alert.success(id ? 'Patient updated' : 'Patient registered successfully');
        this.saving.set(false);
        this.closeForm();
        this.loadPatients();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to save patient');
        this.saving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  viewPatient(patient: Patient): void {
    this.selectedPatient.set(patient);
    this.showForm.set(false);
    this.loadPatientHistory(patient.id);
  }

  closeProfile(): void { this.selectedPatient.set(null); }

  private loadPatientHistory(id: number): void {
    // Backend provides consultation history via /patients/:id/history
    this.common.getApi(`patients/${id}/history`).subscribe({
      next: (r: any) => { this.appointmentHistory = r?.data || []; this.cdr.markForCheck(); },
      error: () => { this.appointmentHistory = []; this.cdr.markForCheck(); }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  getAge(dob: string | undefined): string {
    if (!dob) return '—';
    const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    return `${years} yrs`;
  }
}
