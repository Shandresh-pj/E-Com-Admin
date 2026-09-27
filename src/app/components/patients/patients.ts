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
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Patient } from 'src/app/models/healthcare.models';
import { formatDateDDMMYYYY, parseDateFromDDMMYYYY } from 'src/app/utils/date-utils';

@Component({
  selector: 'app-patients',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
    MatTabsModule, MatDatepickerModule, MatNativeDateModule, TablerIconsModule
  ],
  templateUrl: './patients.html',
  styleUrl: './patients.scss',
})
export class PatientsComponent implements OnInit, OnDestroy {
  patients             = signal<Patient[]>([]);
  loading              = signal(false);
  saving               = signal(false);
  showForm             = signal(false);
  editingId            = signal<number | null>(null);
  searchQuery          = signal<string>('');
  selectedGender       = signal<string>('ALL');
  selectedBloodGroup   = signal<string>('ALL');
  sortBy               = signal<'name' | 'newest' | 'age'>('name');
  allergiesOnly        = signal<boolean>(false);
  activeDrawerTab      = signal<'overview' | 'appointments' | 'vitals'>('overview');
  viewMode             = signal<'grid' | 'list'>('list');
  selectedPatient      = signal<Patient | null>(null);
  formValues           = signal<Partial<Patient>>({});
  copiedCode           = signal<string | null>(null);

  // History tabs data
  appointmentHistory:  any[] = [];
  prescriptionHistory: any[] = [];
  paymentHistory:      any[] = [];
  historyLoading       = signal(false);

  form!: FormGroup;
  private subs = new Subscription();

  readonly genderOptions = ['Male', 'Female', 'Other'];
  readonly bloodGroups   = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Computed filtered list
  filteredPatients = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const gender = this.selectedGender();
    const bg = this.selectedBloodGroup();
    const allergyFilter = this.allergiesOnly();
    const sort = this.sortBy();

    let list = this.patients().filter(p => {
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.patient_code.toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.blood_group || '').toLowerCase().includes(q);

      const matchesGender = gender === 'ALL' || p.gender === gender;
      const matchesBG = bg === 'ALL' || p.blood_group === bg;
      const matchesAllergy = !allergyFilter || (!!p.allergies && p.allergies.trim().length > 0);

      return matchesSearch && matchesGender && matchesBG && matchesAllergy;
    });

    if (sort === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'newest') {
      list = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (sort === 'age') {
      list = [...list].sort((a, b) => {
        const tA = a.date_of_birth ? new Date(a.date_of_birth).getTime() : 0;
        const tB = b.date_of_birth ? new Date(b.date_of_birth).getTime() : 0;
        return tA - tB;
      });
    }

    return list;
  });

  // Computed metrics
  maleCount = computed(() => this.patients().filter(p => p.gender === 'Male').length);
  femaleCount = computed(() => this.patients().filter(p => p.gender === 'Female').length);
  otherGenderCount = computed(() => this.patients().filter(p => p.gender === 'Other').length);

  malePercent = computed(() => {
    const total = this.patients().length;
    return total ? Math.round((this.maleCount() / total) * 100) : 0;
  });

  femalePercent = computed(() => {
    const total = this.patients().length;
    return total ? Math.round((this.femaleCount() / total) * 100) : 0;
  });

  patientsWithAllergiesCount = computed(() => {
    return this.patients().filter(p => p.allergies && p.allergies.trim().length > 0).length;
  });

  bloodGroupCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const p of this.patients()) {
      if (p.blood_group) {
        counts[p.blood_group] = (counts[p.blood_group] || 0) + 1;
      }
    }
    return counts;
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
    this.loadPatients();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

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

    // Real-time listener for form live preview
    this.subs.add(
      this.form.valueChanges.subscribe(val => {
        this.formValues.set(val);
        this.cdr.markForCheck();
      })
    );
  }

  loadPatients(): void {
    this.loading.set(true);
    this.common.getApi('patients').subscribe({
      next: (res: any) => {
        this.patients.set(res?.data || []);
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

  selectGenderFilter(gender: string): void {
    this.selectedGender.set(gender);
    this.cdr.markForCheck();
  }

  selectBloodGroupFilter(bg: string): void {
    this.selectedBloodGroup.set(bg);
    this.cdr.markForCheck();
  }

  openForm(patient?: Patient): void {
    if (patient) {
      this.editingId.set(patient.id);
      this.form.patchValue({
        ...patient,
        date_of_birth: parseDateFromDDMMYYYY(patient.date_of_birth)
      });
      this.formValues.set(patient);
    } else {
      this.editingId.set(null);
      const defaultVal: Partial<Patient> = { gender: 'Male' };
      this.form.reset(defaultVal);
      this.formValues.set(defaultVal);
    }
    this.showForm.set(true);
    this.selectedPatient.set(null);
    this.cdr.markForCheck();
  }

  closeForm(): void {
    this.showForm.set(false);
    this.cdr.markForCheck();
  }

  savePatient(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const payload = {
      ...this.form.value,
      date_of_birth: formatDateDDMMYYYY(this.form.value.date_of_birth)
    };
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`patients/${id}`, payload)
      : this.common.postApi('patients', payload);

    req$.subscribe({
      next: () => {
        this.alert.success(id ? 'Patient details updated' : 'Patient registered successfully');
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

  viewPatient(patient: Patient, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedPatient.set(patient);
    this.showForm.set(false);
    this.loadPatientHistory(patient.id);
    this.cdr.markForCheck();
  }

  closeProfile(): void {
    this.selectedPatient.set(null);
    this.cdr.markForCheck();
  }

  private loadPatientHistory(id: number): void {
    this.historyLoading.set(true);
    this.common.getApi(`patients/${id}/history`).subscribe({
      next: (r: any) => {
        this.appointmentHistory = r?.data || [];
        this.historyLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.appointmentHistory = [];
        this.historyLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  copyPatientCode(code?: string, event?: Event): void {
    if (event) event.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode.set(code);
      this.alert.success(`Patient code ${code} copied to clipboard`);
      setTimeout(() => {
        if (this.copiedCode() === code) this.copiedCode.set(null);
        this.cdr.markForCheck();
      }, 2500);
      this.cdr.markForCheck();
    });
  }

  getInitials(name?: string): string {
    if (!name) return 'PT';
    return name
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getAge(dob?: string): string {
    if (!dob) return '—';
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return '—';
    const years = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
    return `${years} yrs`;
  }

  getGenderGradient(gender?: string): string {
    if (!gender) return 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
    const g = gender.toLowerCase();
    if (g === 'female') return 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)';
    if (g === 'other') return 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
    return 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'; // Male blue default
  }

  getGenderBadgeClass(gender?: string): string {
    if (!gender) return 'hc-gender-badge--Male';
    return `hc-gender-badge--${gender}`;
  }
}

