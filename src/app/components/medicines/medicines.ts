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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablerIconsModule } from 'angular-tabler-icons';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import {
  Medicine, DosageForm, StockStatus,
  STOCK_STATUS_META
} from 'src/app/models/healthcare.models';

@Component({
  selector: 'app-medicines',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatTooltipModule, TablerIconsModule,
  ],
  templateUrl: './medicines.html',
  styleUrl: './medicines.scss',
})
export class MedicinesComponent implements OnInit {
  medicines   = signal<Medicine[]>([]);
  loading     = signal(false);
  saving      = signal(false);
  showForm    = signal(false);
  editingId   = signal<number | null>(null);
  searchQuery = '';
  stockFilter = '';

  filteredMedicines = () => {
    const q = this.searchQuery.toLowerCase();
    const sf = this.stockFilter;
    return this.medicines().filter(m => {
      const stockStatus = this.getComputedStockStatus(m);
      return (
        (!sf || stockStatus === sf) &&
        (!q ||
          (m.name || '').toLowerCase().includes(q) ||
          (m.generic_name || '').toLowerCase().includes(q) ||
          (m.brand || '').toLowerCase().includes(q)
        )
      );
    });
  };

  readonly dosageForms = Object.values(DosageForm);
  readonly stockStatuses = Object.values(StockStatus);
  readonly stockStatusMeta = STOCK_STATUS_META;
  readonly StockStatusEnum = StockStatus;

  form!: FormGroup;

  constructor(
    private fb:     FormBuilder,
    private common: CommonService,
    private alert:  AlertService,
    public  perm:   PermissionService,
    public  cdr:    ChangeDetectorRef,
  ) {}

  /** Expose Math to template for min/max calculations */
  readonly Math = Math;

  ngOnInit(): void {
    this.buildForm();
    this.load();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      name:                     ['', [Validators.required, Validators.minLength(2)]],
      generic_name:             ['', Validators.required],
      brand:                    [''],
      composition:              [''],
      strength:                 ['', Validators.required],
      dosage_form:              ['', Validators.required],
      manufacturer:             [''],
      unit:                     ['strip', Validators.required],
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
  }

  load(): void {
    this.loading.set(true);
    this.common.getApi('medicines').subscribe({
      next:  (r: any) => { this.medicines.set(r?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()       => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  openForm(med?: Medicine): void {
    if (med) { this.editingId.set(med.id); this.form.patchValue(med); }
    else      { this.editingId.set(null); this.form.reset({ unit: 'strip', minimum_stock: 10, reorder_level: 20, maximum_stock: 500, tax_percent: 0, is_active: true, is_prescription_required: false }); }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const id = this.editingId();
    const req$ = id
      ? this.common.putApi(`medicines/${id}`, this.form.value)
      : this.common.postApi('medicines', this.form.value);
    req$.subscribe({
      next: () => { this.alert.success('Medicine saved'); this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => { this.alert.error(e?.error?.message || 'Failed'); this.saving.set(false); this.cdr.markForCheck(); },
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

  getKpiCount(status: StockStatus): number {
    return this.medicines().filter(m => this.getComputedStockStatus(m) === status).length;
  }

  getKpiCountByStatus(statusStr: string): number {
    return this.medicines().filter(m => this.getComputedStockStatus(m) === (statusStr as StockStatus)).length;
  }

  formatPrice(n: number): string {
    return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
