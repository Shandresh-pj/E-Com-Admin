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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import {
  Medicine, DosageForm, StockStatus,
  STOCK_STATUS_META, HcEventType
} from 'src/app/models/healthcare.models';
import { formatDateDDMMYYYY, parseDateFromDDMMYYYY } from 'src/app/utils/date-utils';

@Component({
  selector: 'app-medicines',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDatepickerModule, MatNativeDateModule, TablerIconsModule,
  ],
  templateUrl: './medicines.html',
  styleUrl: './medicines.scss',
})
export class MedicinesComponent implements OnInit, OnDestroy {
  medicines        = signal<Medicine[]>([]);
  loading          = signal(false);
  saving           = signal(false);
  showForm         = signal(false);
  editingId        = signal<number | null>(null);
  searchQuery      = signal('');
  stockFilter      = signal('');
  viewMode         = signal<'grid' | 'list'>('list');   // Table-first
  selectedMedicine = signal<Medicine | null>(null);
  formValues       = signal<any>({});

  filteredMedicines = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sf = this.stockFilter();
    return this.medicines().filter(m => {
      const stockStatus = this.getComputedStockStatus(m);
      return (
        (!sf || stockStatus === sf) &&
        (!q ||
          (m.name || '').toLowerCase().includes(q) ||
          (m.generic_name || '').toLowerCase().includes(q) ||
          (m.brand || '').toLowerCase().includes(q) ||
          (m.manufacturer || '').toLowerCase().includes(q)
        )
      );
    });
  });

  normalCount        = computed(() => this.medicines().filter(m => this.getComputedStockStatus(m) === StockStatus.NORMAL).length);
  lowStockCount      = computed(() => this.medicines().filter(m => this.getComputedStockStatus(m) === StockStatus.LOW_STOCK).length);
  criticalStockCount = computed(() => this.medicines().filter(m => this.getComputedStockStatus(m) === StockStatus.CRITICAL_STOCK).length);
  outOfStockCount    = computed(() => this.medicines().filter(m => this.getComputedStockStatus(m) === StockStatus.OUT_OF_STOCK).length);

  readonly dosageForms = Object.values(DosageForm);
  readonly stockStatuses = Object.values(StockStatus);
  readonly stockStatusMeta = STOCK_STATUS_META;
  readonly StockStatusEnum = StockStatus;

  readonly unitOfMeasureOptions = [
    'Strip', 'Tablet', 'Capsule', 'Bottle', 'Vial', 'Sachet',
    'Tube', 'Pcs', 'ML', 'MG', 'Box', 'Ampoule', 'Inhaler', 'Patch'
  ];

  readonly prescriptionControlOptions = [
    'OTC (Over The Counter)',
    'Prescription Only',
    'Schedule H',
    'Schedule H1',
    'Schedule X',
    'Schedule G',
  ];

  form!: FormGroup;
  private subs = new Subscription();

  constructor(
    private fb:     FormBuilder,
    private common: CommonService,
    private alert:  AlertService,
    public  perm:   PermissionService,
    public  cdr:    ChangeDetectorRef,
    private socket: SocketService,
  ) {}

  readonly Math = Math;

  ngOnInit(): void {
    this.buildForm();
    this.load();
    // Subscribe to real-time stock alerts from POS socket events
    this.subs.add(this.socket.on('low_stock').subscribe((payload: any) => {
      this.alert.info(`⚠️ Low Stock: ${payload?.name} — ${payload?.stock} units remaining`);
    }));
    this.subs.add(this.socket.on('critical_stock').subscribe((payload: any) => {
      this.alert.warning(`🔴 Critical Stock: ${payload?.name} — only ${payload?.stock} left!`);
      this.load(); // Refresh list
    }));
    this.subs.add(this.socket.on('out_of_stock').subscribe((payload: any) => {
      this.alert.error(`❌ OUT OF STOCK: ${payload?.name} is completely out!`);
      this.load();
    }));
    this.subs.add(this.socket.on(HcEventType.STOCK_APPROVED).subscribe(() => this.load()));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private buildForm(): void {
    this.form = this.fb.group({
      name:                     ['', [Validators.required, Validators.minLength(2)]],
      generic_name:             ['', Validators.required],
      brand:                    [''],
      composition:              [''],
      strength:                 ['', Validators.required],
      dosage_form:              ['', Validators.required],
      manufacturer:             ['', Validators.required],      // MANDATORY
      unit:                     ['', Validators.required],       // UoM select
      batch_no:                 ['', Validators.required],       // MANDATORY
      manufacture_date:         [null, Validators.required],     // MANDATORY
      expiry_date:              [null, Validators.required],     // MANDATORY
      prescription_control:     ['OTC (Over The Counter)'],     // Control type
      minimum_stock:            [10, [Validators.required, Validators.min(0)]],
      reorder_level:            [20, [Validators.required, Validators.min(0)]],
      maximum_stock:            [500, [Validators.required, Validators.min(1)]],
      purchase_price:           [0, [Validators.required, Validators.min(0)]],
      mrp:                      [0, [Validators.required, Validators.min(0)]],
      selling_price:            [0, [Validators.required, Validators.min(0)]],
      tax_percent:              [0, [Validators.min(0)]],
      is_prescription_required: [false],
      is_active:                [true],
      description:              [''],
    });

    this.form.valueChanges.subscribe(val => {
      this.formValues.set(val);
      this.cdr.markForCheck();
    });
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.cdr.markForCheck();
  }

  selectStockFilter(f: string): void {
    this.stockFilter.set(f);
    this.cdr.markForCheck();
  }

  viewMedDetails(m: Medicine, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedMedicine.set(m);
    this.cdr.markForCheck();
  }

  closeMedDetails(): void {
    this.selectedMedicine.set(null);
    this.cdr.markForCheck();
  }

  load(): void {
    this.loading.set(true);
    this.common.getApi('medicines').subscribe({
      next:  (r: any) => { this.medicines.set(r?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()       => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  openForm(med?: Medicine): void {
    if (med) {
      this.editingId.set(med.id);
      this.form.patchValue({
        ...med,
        // Parse date strings to Date objects for datepicker
        manufacture_date: (med as any).manufacture_date ? parseDateFromDDMMYYYY((med as any).manufacture_date) || new Date((med as any).manufacture_date) : null,
        expiry_date:      (med as any).expiry_date      ? parseDateFromDDMMYYYY((med as any).expiry_date)      || new Date((med as any).expiry_date)      : null,
      });
    } else {
      this.editingId.set(null);
      this.form.reset({
        unit: '', minimum_stock: 10, reorder_level: 20, maximum_stock: 500,
        tax_percent: 0, is_active: true, is_prescription_required: false,
        prescription_control: 'OTC (Over The Counter)',
      });
    }
    this.showForm.set(true);
    this.cdr.markForCheck();
  }

  closeForm(): void { this.showForm.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const id = this.editingId();
    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      manufacture_date: formatDateDDMMYYYY(raw.manufacture_date),
      expiry_date:      formatDateDDMMYYYY(raw.expiry_date),
    };
    const req$ = id
      ? this.common.putApi(`medicines/${id}`, payload)
      : this.common.postApi('medicines', payload);
    req$.subscribe({
      next: () => { this.alert.success('Medicine saved successfully'); this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => { this.alert.error(e?.error?.message || 'Failed to save medicine'); this.saving.set(false); this.cdr.markForCheck(); },
    });
  }

  deleteMedicine(med: Medicine): void {
    this.alert.confirm('This action cannot be undone.', `Delete ${med.name}?`).then((r: any) => {
      if (!r.isConfirmed) return;
      this.common.deleteApi(`medicines/${med.id}`).subscribe({
        next: () => { this.alert.success('Medicine deleted'); this.load(); },
        error: (e: any) => this.alert.error(e?.error?.message || 'Failed to delete'),
      });
    });
  }

  getComputedStockStatus(med: any): StockStatus {
    const stock = med.current_stock ?? 0;
    const reorder = med.reorder_level ?? 10;
    if (stock <= 0) return StockStatus.OUT_OF_STOCK;
    if (stock <= Math.floor(reorder * 0.5)) return StockStatus.CRITICAL_STOCK;
    if (stock <= reorder) return StockStatus.LOW_STOCK;
    return StockStatus.NORMAL;
  }

  getStockClass(med: any): string {
    const status = this.getComputedStockStatus(med);
    return this.stockStatusMeta[status]?.cssClass || '';
  }

  getStockLabel(med: any): string {
    const status = this.getComputedStockStatus(med);
    return this.stockStatusMeta[status]?.label || '';
  }

  getStockColor(med: any): string {
    const status = this.getComputedStockStatus(med);
    return this.stockStatusMeta[status]?.color || '#666';
  }

  getKpiCountByStatus(statusStr: string): number {
    return this.medicines().filter(m => this.getComputedStockStatus(m) === (statusStr as StockStatus)).length;
  }

  formatPrice(n: number): string {
    return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
