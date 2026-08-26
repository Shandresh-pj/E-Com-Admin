import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import {
  Prescription, PrescriptionItem, TimeOfDay,
  TIME_OF_DAY_META, HcEventType, MedicationScheduleItem
} from 'src/app/models/healthcare.models';

@Component({
  selector: 'app-prescriptions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatSlideToggleModule, MatTooltipModule,
    MatProgressSpinnerModule, TablerIconsModule,
  ],
  templateUrl: './prescriptions.html',
  styleUrl: './prescriptions.scss',
})
export class PrescriptionsComponent implements OnInit, OnDestroy {
  prescriptions = signal<Prescription[]>([]);
  loading       = signal(false);
  saving        = signal(false);
  showForm      = signal(false);
  editingId     = signal<number | null>(null);
  searchQuery   = '';

  doctors:    any[] = [];
  patients:   any[] = [];
  medicines:  any[] = [];

  filteredPrescriptions = () => {
    const q = this.searchQuery.toLowerCase();
    return this.prescriptions().filter(p =>
      !q ||
      (p.patient_name || '').toLowerCase().includes(q) ||
      (p.doctor_name  || '').toLowerCase().includes(q) ||
      p.prescription_code.toLowerCase().includes(q)
    );
  };

  get dispensedCount(): number {
    return this.prescriptions().filter(p => p.is_dispensed).length;
  }

  get pendingDispenseCount(): number {
    return this.prescriptions().filter(p => !p.is_dispensed).length;
  }

  readonly timeOfDayList = Object.values(TimeOfDay);
  readonly todMeta = TIME_OF_DAY_META;
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
    this.load();
    this.loadLookups();
    this.subs.add(
      this.socket.on(HcEventType.PRESCRIPTION_CREATED).subscribe(() => this.load())
    );
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private buildForm(): void {
    this.form = this.fb.group({
      patient_id:         ['', Validators.required],
      doctor_id:          ['', Validators.required],
      prescription_date:  [new Date().toISOString().split('T')[0], Validators.required],
      notes:              [''],
      items:              this.fb.array([]),
    });
    this.addItem(); // Start with one empty item
  }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  addItem(): void {
    const itemGroup = this.fb.group({
      medicine_id:   ['', Validators.required],
      quantity:      [1, [Validators.required, Validators.min(1)]],
      duration_days: [5, [Validators.required, Validators.min(1)]],
      frequency:     [''],
      instructions:  [''],
      schedule:      this.fb.array(this.buildDefaultSchedule()),
    });
    this.items.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  private buildDefaultSchedule(): FormGroup[] {
    return this.timeOfDayList.map(tod =>
      this.fb.group({
        time_of_day:  [tod],
        quantity:     [0],
        unit:         ['tablet'],
        before_food:  [false],
        selected:     [false],
        instructions: [''],
      })
    );
  }

  getScheduleArray(itemIndex: number): FormArray {
    return this.items.at(itemIndex).get('schedule') as FormArray;
  }

  load(): void {
    this.loading.set(true);
    this.common.getApi('prescriptions').subscribe({
      next:  (r: any) => { this.prescriptions.set(r?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()       => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  private loadLookups(): void {
    this.common.getApi('doctors?is_active=true').subscribe({ next: (r: any) => { this.doctors = r?.data || []; this.cdr.markForCheck(); } });
    this.common.getApi('patients').subscribe({ next: (r: any) => { this.patients = r?.data || []; this.cdr.markForCheck(); } });
    this.common.getApi('medicines?is_active=true').subscribe({ next: (r: any) => { this.medicines = r?.data || []; this.cdr.markForCheck(); } });
  }

  openForm(rx?: Prescription): void {
    if (rx) {
      this.editingId.set(rx.id);
      // Patch base fields
      this.form.patchValue({
        patient_id:        rx.patient_id,
        doctor_id:         rx.doctor_id,
        prescription_date: rx.prescription_date,
        notes:             rx.notes,
      });
      // Rebuild items
      while (this.items.length > 0) this.items.removeAt(0);
      rx.items.forEach(() => this.addItem());
      this.items.patchValue(rx.items);
    } else {
      this.editingId.set(null);
      this.form.reset({ prescription_date: new Date().toISOString().split('T')[0] });
      while (this.items.length > 0) this.items.removeAt(0);
      this.addItem();
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = this.form.value;
    // Filter schedule: only include selected time-of-day entries
    payload.items = payload.items.map((item: any) => ({
      ...item,
      schedule: item.schedule.filter((s: any) => s.selected && s.quantity > 0),
    }));
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`prescriptions/${id}`, payload)
      : this.common.postApi('prescriptions', payload);
    req$.subscribe({
      next: () => {
        this.alert.success('Prescription saved');
        this.saving.set(false);
        this.closeForm();
        this.load();
      },
      error: (e: any) => { this.alert.error(e?.error?.message || 'Failed to save'); this.saving.set(false); this.cdr.markForCheck(); },
    });
  }

  getMedicineName(id: number): string {
    return this.medicines.find(m => m.id === id)?.name || `Medicine #${id}`;
  }

  getTotalItems(rx: Prescription): number {
    return rx.items?.length || 0;
  }

  getActiveSchedule(item: PrescriptionItem): MedicationScheduleItem[] {
    return item.schedule?.filter(s => s.quantity > 0) || [];
  }
}
