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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Doctor, HcEventType } from 'src/app/models/healthcare.models';

@Component({
  selector: 'app-doctors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule, MatSlideToggleModule,
    MatDialogModule, MatProgressSpinnerModule, MatChipsModule, TablerIconsModule,
  ],
  templateUrl: './doctors.html',
  styleUrl: './doctors.scss',
})
export class DoctorsComponent implements OnInit, OnDestroy {
  doctors     = signal<Doctor[]>([]);
  loading     = signal(false);
  saving      = signal(false);
  showForm    = signal(false);
  editingId   = signal<number | null>(null);
  searchQuery = '';
  viewMode    = signal<'grid' | 'list'>('grid');

  filteredDoctors = () => {
    const q = this.searchQuery.toLowerCase();
    return this.doctors().filter(d =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.specialization.toLowerCase().includes(q) ||
      d.registration_number.toLowerCase().includes(q)
    );
  };

  get activeCount(): number {
    return this.doctors().filter(d => d.is_active).length;
  }

  form!: FormGroup;
  private subs = new Subscription();

  readonly specializations = [
    'General Medicine', 'Cardiology', 'Dermatology', 'ENT', 'Gastroenterology',
    'General Surgery', 'Gynecology & Obstetrics', 'Neurology', 'Neurosurgery',
    'Oncology', 'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Psychiatry',
    'Pulmonology', 'Radiology', 'Urology', 'Nephrology', 'Endocrinology',
    'Rheumatology', 'Dental', 'Physiotherapy', 'Anesthesiology', 'Pathology',
  ];

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
    this.loadDoctors();
    // No real-time events needed for doctor master data; doctors are managed infrequently.
    // The socket service is injected for future extensibility (e.g. live consultation status).
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private buildForm(): void {
    this.form = this.fb.group({
      name:                ['', [Validators.required, Validators.minLength(2)]],
      specialization:      ['', Validators.required],
      qualification:       ['', Validators.required],
      experience_years:    [0,  [Validators.required, Validators.min(0), Validators.max(60)]],
      registration_number: ['', Validators.required],
      registration_body:   [''],
      phone:               ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{7,15}$/)]],
      email:               ['', [Validators.email]],
      consultation_fee:    [0,  [Validators.required, Validators.min(0)]],
      description:         [''],
      is_active:           [true],
    });
  }

  loadDoctors(): void {
    this.loading.set(true);
    this.common.getApi('doctors').subscribe({
      next:  (res: any) => { this.doctors.set(res?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()         => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  openForm(doctor?: Doctor): void {
    if (doctor) {
      this.editingId.set(doctor.id);
      this.form.patchValue(doctor);
    } else {
      this.editingId.set(null);
      this.form.reset({ is_active: true, experience_years: 0, consultation_fee: 0 });
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  saveDoctor(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = this.form.value;
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`doctors/${id}`, payload)
      : this.common.postApi('doctors', payload);

    req$.subscribe({
      next: () => {
        this.alert.success(id ? 'Doctor updated successfully' : 'Doctor added successfully');
        this.saving.set(false);
        this.closeForm();
        this.loadDoctors();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to save doctor');
        this.saving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  toggleStatus(doctor: Doctor): void {
    const willDeactivate = doctor.is_active;
    const action = willDeactivate ? 'Deactivate' : 'Activate';
    this.alert.confirm(`${action} Dr. ${doctor.name}?`).then((r: any) => {
      if (!r.isConfirmed) return;
      if (willDeactivate) {
        // Soft delete via DELETE endpoint
        this.common.deleteApi(`doctors/${doctor.id}`).subscribe({
          next: () => { this.alert.success('Doctor deactivated'); this.loadDoctors(); },
          error: (err: any) => this.alert.error(err?.error?.message || 'Action failed'),
        });
      } else {
        // Reactivate via PUT
        this.common.putApi(`doctors/${doctor.id}`, { ...doctor, is_active: true }).subscribe({
          next: () => { this.alert.success('Doctor activated'); this.loadDoctors(); },
          error: (err: any) => this.alert.error(err?.error?.message || 'Action failed'),
        });
      }
    });
  }


  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  formatFee(fee: number): string {
    return '₹' + (fee || 0).toLocaleString('en-IN');
  }
}
