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
import { Doctor } from 'src/app/models/healthcare.models';

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
  doctors               = signal<Doctor[]>([]);
  loading               = signal(false);
  saving                = signal(false);
  showForm              = signal(false);
  editingId             = signal<number | null>(null);
  searchQuery           = signal<string>('');
  selectedSpecialty     = signal<string>('ALL');
  viewMode              = signal<'grid' | 'list'>('grid');
  selectedDoctorModal   = signal<Doctor | null>(null);
  formValues            = signal<Partial<Doctor>>({});
  copiedRegId           = signal<string | null>(null);

  form!: FormGroup;
  private subs = new Subscription();

  readonly specializations = [
    'General Medicine', 'Cardiology', 'Dermatology', 'ENT', 'Gastroenterology',
    'General Surgery', 'Gynecology & Obstetrics', 'Neurology', 'Neurosurgery',
    'Oncology', 'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Psychiatry',
    'Pulmonology', 'Radiology', 'Urology', 'Nephrology', 'Endocrinology',
    'Rheumatology', 'Dental', 'Physiotherapy', 'Anesthesiology', 'Pathology',
  ];

  // Computed state for active doctor filters
  filteredDoctors = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const spec = this.selectedSpecialty();
    return this.doctors().filter(d => {
      const matchesSearch = !q ||
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        d.registration_number.toLowerCase().includes(q) ||
        (d.qualification && d.qualification.toLowerCase().includes(q));

      const matchesSpec = spec === 'ALL' || d.specialization === spec;

      return matchesSearch && matchesSpec;
    });
  });

  // Computed specialization count mapping
  specialtyCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const d of this.doctors()) {
      counts[d.specialization] = (counts[d.specialization] || 0) + 1;
    }
    return counts;
  });

  // Unique active specializations present in actual data
  activeSpecialtiesInList = computed(() => {
    const specs = new Set<string>();
    for (const d of this.doctors()) {
      if (d.specialization) specs.add(d.specialization);
    }
    return Array.from(specs).sort();
  });

  // Active doctor count
  activeCount = computed(() => this.doctors().filter(d => d.is_active).length);

  // Average consultation fee
  avgFee = computed(() => {
    const list = this.doctors();
    if (!list.length) return 0;
    const total = list.reduce((sum, d) => sum + (d.consultation_fee || 0), 0);
    return Math.round(total / list.length);
  });

  // Combined experience across all doctors
  totalExperience = computed(() => {
    return this.doctors().reduce((sum, d) => sum + (d.experience_years || 0), 0);
  });

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
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

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

    // Real-time listener for live card preview in form mode
    this.subs.add(
      this.form.valueChanges.subscribe(val => {
        this.formValues.set(val);
        this.cdr.markForCheck();
      })
    );
  }

  loadDoctors(): void {
    this.loading.set(true);
    this.common.getApi('doctors').subscribe({
      next: (res: any) => {
        this.doctors.set(res?.data || []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.cdr.markForCheck();
  }

  selectSpecialty(spec: string): void {
    this.selectedSpecialty.set(spec);
    this.cdr.markForCheck();
  }

  openForm(doctor?: Doctor): void {
    if (doctor) {
      this.editingId.set(doctor.id);
      this.form.patchValue(doctor);
      this.formValues.set(doctor);
    } else {
      this.editingId.set(null);
      const defaultVal = { is_active: true, experience_years: 0, consultation_fee: 0 };
      this.form.reset(defaultVal);
      this.formValues.set(defaultVal);
    }
    this.showForm.set(true);
    this.cdr.markForCheck();
  }

  closeForm(): void {
    this.showForm.set(false);
    this.cdr.markForCheck();
  }

  openQuickView(doctor: Doctor, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedDoctorModal.set(doctor);
    this.cdr.markForCheck();
  }

  closeQuickView(): void {
    this.selectedDoctorModal.set(null);
    this.cdr.markForCheck();
  }

  saveDoctor(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const payload = this.form.value;
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`doctors/${id}`, payload)
      : this.common.postApi('doctors', payload);

    req$.subscribe({
      next: () => {
        this.alert.success(id ? 'Doctor details updated' : 'Doctor registered successfully');
        this.saving.set(false);
        this.closeForm();
        this.loadDoctors();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to save doctor details');
        this.saving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  toggleStatus(doctor: Doctor, event?: Event): void {
    if (event) event.stopPropagation();
    const willDeactivate = doctor.is_active;
    const action = willDeactivate ? 'Deactivate' : 'Activate';
    this.alert.confirm(`${action} Dr. ${doctor.name}?`).then((r: any) => {
      if (!r.isConfirmed) return;
      if (willDeactivate) {
        this.common.deleteApi(`doctors/${doctor.id}`).subscribe({
          next: () => {
            this.alert.success('Doctor deactivated');
            this.loadDoctors();
          },
          error: (err: any) => this.alert.error(err?.error?.message || 'Action failed'),
        });
      } else {
        this.common.putApi(`doctors/${doctor.id}`, { ...doctor, is_active: true }).subscribe({
          next: () => {
            this.alert.success('Doctor activated');
            this.loadDoctors();
          },
          error: (err: any) => this.alert.error(err?.error?.message || 'Action failed'),
        });
      }
    });
  }

  copyRegNo(regNo: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!regNo) return;
    navigator.clipboard.writeText(regNo).then(() => {
      this.copiedRegId.set(regNo);
      this.alert.success(`Registration No. ${regNo} copied to clipboard`);
      setTimeout(() => {
        if (this.copiedRegId() === regNo) this.copiedRegId.set(null);
        this.cdr.markForCheck();
      }, 2500);
      this.cdr.markForCheck();
    });
  }

  getInitials(name?: string): string {
    if (!name) return 'DR';
    return name
      .replace(/^Dr\.?\s+/i, '')
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  formatFee(fee?: number): string {
    return '₹' + (fee || 0).toLocaleString('en-IN');
  }

  // Dynamic Avatar & Card Gradient palette based on Specialization
  getSpecialtyGradient(specialty?: string): string {
    if (!specialty) return 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
    const spec = specialty.toLowerCase();

    if (spec.includes('cardio')) return 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'; // Crimson / Red
    if (spec.includes('neuro')) return 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)'; // Deep Violet
    if (spec.includes('derma')) return 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'; // Pink / Rose
    if (spec.includes('pedia')) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; // Warm Amber
    if (spec.includes('ortho')) return 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'; // Ocean Blue
    if (spec.includes('gastro') || spec.includes('surg')) return 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)'; // Teal
    if (spec.includes('ent') || spec.includes('ophthal')) return 'linear-gradient(135deg, #059669 0%, #047857 100%)'; // Emerald
    if (spec.includes('psych') || spec.includes('oncology')) return 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)'; // Purple

    return 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'; // Sapphire default
  }

  getSpecialtyBadgeClass(specialty?: string): string {
    if (!specialty) return 'badge-indigo';
    const spec = specialty.toLowerCase();

    if (spec.includes('cardio')) return 'badge-rose';
    if (spec.includes('neuro')) return 'badge-violet';
    if (spec.includes('derma')) return 'badge-pink';
    if (spec.includes('pedia')) return 'badge-amber';
    if (spec.includes('ortho')) return 'badge-sky';
    if (spec.includes('surg') || spec.includes('gastro')) return 'badge-teal';
    if (spec.includes('ent') || spec.includes('ophthal')) return 'badge-emerald';

    return 'badge-indigo';
  }
}

