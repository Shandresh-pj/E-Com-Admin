import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-unit-options',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTable
  ],
  templateUrl: './unit-options.html',
  styleUrl: './unit-options.scss',
})
export class UnitOptionsComponent implements OnInit {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'name', header: 'Unit Name' },
    { columnDef: 'symbol', header: 'Symbol' },
    { columnDef: 'category', header: 'Category' },
    { columnDef: 'status', header: 'Status', type: 'badge' },
  ];

  UnitForm: FormGroup;
  showForm: boolean = false;
  isEditMode: boolean = false;
  selectedUnitId: number | null = null;
  unitsList: any[] = [];
  filteredUnitsList: any[] = [];
  isLoading: boolean = false;
  selectedCategoryFilter: string = 'ALL';

  categoryOptions = [
    { label: 'Count (pc, box, pkt...)', value: 'COUNT' },
    { label: 'Weight (kg, g, t...)', value: 'WEIGHT' },
    { label: 'Volume (l, ml...)', value: 'VOLUME' },
    { label: 'Length (m, ft...)', value: 'LENGTH' }
  ];

  get totalUnitsCount(): number { return (this.unitsList || []).length; }
  get countCategoryCount(): number { return (this.unitsList || []).filter(u => u.category === 'COUNT').length; }
  get weightCategoryCount(): number { return (this.unitsList || []).filter(u => u.category === 'WEIGHT').length; }
  get volumeCategoryCount(): number { return (this.unitsList || []).filter(u => u.category === 'VOLUME').length; }
  get lengthCategoryCount(): number { return (this.unitsList || []).filter(u => u.category === 'LENGTH').length; }

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    public perm: PermissionService
  ) {
    this.UnitForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      symbol: ['', [Validators.required, Validators.maxLength(20)]],
      category: ['COUNT', [Validators.required]],
      status: [true]
    });
  }

  ngOnInit(): void {
    this.loadUnits();
  }

  loadUnits(): void {
    this.isLoading = true;
    this.commonService.getApi('unit-options').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.unitsList = raw.map((u: any, idx: number) => ({
          ...u,
          id: u.id ?? idx + 1,
          status: u.status !== false ? 'Active' : 'Inactive'
        }));
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.unitsList = [];
        this.filteredUnitsList = [];
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter(): void {
    if (this.selectedCategoryFilter === 'ALL') {
      this.filteredUnitsList = [...this.unitsList];
    } else {
      this.filteredUnitsList = this.unitsList.filter(
        u => (u.category || '').toUpperCase() === this.selectedCategoryFilter
      );
    }
  }

  onFilterCategoryChange(cat: string): void {
    this.selectedCategoryFilter = cat;
    this.applyFilter();
  }

  syncDefaultUnits(): void {
    this.isLoading = true;
    this.commonService.postApi('unit-options/seed-defaults', {}).subscribe({
      next: (res: any) => {
        this.alert.success(res?.message || 'Default units synchronized successfully');
        this.loadUnits();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.alert.error(err?.error?.message || 'Failed to sync default units');
      }
    });
  }

  openAddForm(): void {
    this.isEditMode = false;
    this.selectedUnitId = null;
    this.UnitForm.reset({
      name: '',
      symbol: '',
      category: 'COUNT',
      status: true
    });
    this.showForm = true;
  }

  openEditForm(unit: any): void {
    this.selectedUnitId = unit.id;
    this.isEditMode = true;
    this.UnitForm.patchValue({
      name: unit.name || '',
      symbol: unit.symbol || '',
      category: unit.category || 'COUNT',
      status: unit.status === 'Active' || unit.status === true
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.selectedUnitId = null;
    this.UnitForm.reset({
      name: '',
      symbol: '',
      category: 'COUNT',
      status: true
    });
  }

  saveUnit(): void {
    if (this.UnitForm.invalid) {
      this.UnitForm.markAllAsTouched();
      return;
    }

    const formVal = this.UnitForm.value;
    const payload = {
      name: (formVal.name || '').trim(),
      symbol: (formVal.symbol || '').trim(),
      category: formVal.category,
      status: Boolean(formVal.status)
    };

    if (!this.isEditMode) {
      this.commonService.postApi('unit-options/create', payload).subscribe({
        next: (res: any) => {
          this.alert.success(res?.message || 'Unit option created successfully');
          this.loadUnits();
          this.cancelForm();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Failed to create unit option');
        }
      });
    } else {
      this.commonService.putApi(`unit-options/${this.selectedUnitId}`, payload).subscribe({
        next: (res: any) => {
          this.alert.success(res?.message || 'Unit option updated successfully');
          this.loadUnits();
          this.cancelForm();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Failed to update unit option');
        }
      });
    }
  }

  deleteUnit(unit: any): void {
    const targetId = unit.id;
    this.alert.confirm(`Are you sure you want to delete unit '${unit.name}'?`).then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`unit-options/${targetId}`).subscribe({
          next: (res: any) => {
            this.alert.success(res?.message || 'Unit option deleted successfully');
            this.loadUnits();
          },
          error: (err: any) => {
            this.alert.error(err?.error?.message || 'Failed to delete unit option');
          }
        });
      }
    });
  }
}
