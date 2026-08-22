import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { ViewDetailsDialog } from 'src/utils/view-details-dialog/view-details-dialog';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-attribute',
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
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './product-attribute.html',
  styleUrl: './product-attribute.scss',
})
export class ProductAttribute implements OnInit, OnDestroy {
  ProductAttributes: any[] = [];
  AttributeValuesMap: Map<number, any[]> = new Map();
  
  selectedAttribute: any = null;
  selectedAttributeValues: any[] = [];
  
  searchAttributeQuery: string = '';
  searchValueQuery: string = '';
  activeAttrTab: 'ALL' | 'WITH_VALS' | 'EMPTY' = 'ALL';
  activeMobileView: 'LEFT' | 'RIGHT' = 'LEFT';

  loadingAttributes: boolean = false;
  loadingValues: boolean = false;

  // Forms & Modal states
  ProductAttributeForm: FormGroup;
  AttributeValueForm: FormGroup;

  showAttributeForm: boolean = false;
  isAttributeEdit: boolean = false;
  selectedAttributeIdToEdit: any = null;

  showValueForm: boolean = false;
  isValueEdit: boolean = false;
  selectedValueIdToEdit: any = null;

  // Attribute Quick Presets
  attributePresets = [
    { code: 'COLOR', name: 'Color' },
    { code: 'SIZE', name: 'Size' },
    { code: 'STORAGE', name: 'Storage Capacity' },
    { code: 'RAM', name: 'RAM Memory' },
    { code: 'MATERIAL', name: 'Material' },
    { code: 'WEIGHT', name: 'Weight' }
  ];

  // Child Value Presets Map
  colorPresets = [
    { code: '#EF4444', name: 'Red' },
    { code: '#3B82F6', name: 'Blue' },
    { code: '#10B981', name: 'Green' },
    { code: '#0F172A', name: 'Black' },
    { code: '#F8FAFC', name: 'White' },
    { code: '#F59E0B', name: 'Gold' }
  ];

  sizePresets = [
    { code: 'S', name: 'Small (S)' },
    { code: 'M', name: 'Medium (M)' },
    { code: 'L', name: 'Large (L)' },
    { code: 'XL', name: 'Extra Large (XL)' },
    { code: 'XXL', name: 'Double XL (XXL)' }
  ];

  storagePresets = [
    { code: '64GB', name: '64 GB' },
    { code: '128GB', name: '128 GB' },
    { code: '256GB', name: '256 GB' },
    { code: '512GB', name: '512 GB' },
    { code: '1TB', name: '1 TB' }
  ];

  private socketSub = new Subscription();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    public perm: PermissionService,
    private socketService: SocketService
  ) {
    // Parent Attribute Form
    this.ProductAttributeForm = this.fb.group({
      AttributeNameCode: ['', [Validators.required, Validators.maxLength(50)]],
      Name: ['', [Validators.required, Validators.maxLength(100)]]
    });

    // Child Attribute Value Form
    this.AttributeValueForm = this.fb.group({
      ProductAttributeId: ['', Validators.required],
      AttributeValueCode: ['', [Validators.required, Validators.maxLength(50)]],
      Name: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  ngOnInit() {
    this.loadAllMasterData();
    this.socketService.connect();
    this.socketSub.add(
      this.socketService.on('attribute-update').subscribe(() => this.loadAllMasterData())
    );
  }

  ngOnDestroy() {
    this.socketSub.unsubscribe();
  }

  getCompanyId() {
    const user = this.authService.getUser();
    const roles = this.authService.getRoles();
    return user?.company_id || user?.CompanyId || roles?.[0]?.company?.id;
  }

  // Quick Preset Handlers
  applyAttributePreset(preset: { code: string, name: string }) {
    this.ProductAttributeForm.patchValue({
      AttributeNameCode: preset.code,
      Name: preset.name
    });
  }

  applyValuePreset(preset: { code: string, name: string }) {
    this.AttributeValueForm.patchValue({
      AttributeValueCode: preset.code,
      Name: preset.name
    });
  }

  // Getters for Stats
  get totalAttributesCount(): number {
    return this.ProductAttributes.length;
  }

  get totalValuesCount(): number {
    let count = 0;
    this.AttributeValuesMap.forEach(vals => count += vals.length);
    return count;
  }

  get filteredAttributes(): any[] {
    let list = this.ProductAttributes;
    if (this.activeAttrTab === 'WITH_VALS') {
      list = list.filter(a => (this.AttributeValuesMap.get(a.Id) || []).length > 0);
    } else if (this.activeAttrTab === 'EMPTY') {
      list = list.filter(a => (this.AttributeValuesMap.get(a.Id) || []).length === 0);
    }

    if (!this.searchAttributeQuery.trim()) return list;
    const q = this.searchAttributeQuery.toLowerCase();
    return list.filter(a =>
      (a.Name || '').toLowerCase().includes(q) ||
      (a.AttributeNameCode || '').toLowerCase().includes(q)
    );
  }

  get filteredValues(): any[] {
    if (!this.searchValueQuery.trim()) return this.selectedAttributeValues;
    const q = this.searchValueQuery.toLowerCase();
    return this.selectedAttributeValues.filter(v =>
      (v.Name || '').toLowerCase().includes(q) ||
      (v.AttributeValueCode || '').toLowerCase().includes(q)
    );
  }

  // Master Data Loader
  loadAllMasterData() {
    this.loadingAttributes = true;
    this.commonService.getApi('product-attributes?limit=100').subscribe({
      next: (res: any) => {
        this.ProductAttributes = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];

        // Load all values to map previews
        this.commonService.getApi('product-attribute-values?limit=1000').subscribe({
          next: (valRes: any) => {
            const allVals = Array.isArray(valRes?.data?.data)
              ? valRes.data.data
              : Array.isArray(valRes?.data)
                ? valRes.data
                : Array.isArray(valRes)
                  ? valRes
                  : [];

            const map = new Map<number, any[]>();
            for (const val of allVals) {
              const attrId = val.ProductAttributeId || val.productAttributeId;
              if (attrId) {
                if (!map.has(attrId)) map.set(attrId, []);
                map.get(attrId)!.push(val);
              }
            }
            this.AttributeValuesMap = map;

            // Auto-select active attribute
            if (this.ProductAttributes.length > 0) {
              const currentId = this.selectedAttribute?.Id;
              const exists = this.ProductAttributes.find(a => a.Id === currentId);
              this.selectAttribute(exists || this.ProductAttributes[0]);
            } else {
              this.selectedAttribute = null;
              this.selectedAttributeValues = [];
            }

            this.loadingAttributes = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loadingAttributes = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.loadingAttributes = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectAttribute(attr: any) {
    if (!attr) return;
    this.selectedAttribute = attr;
    this.selectedAttributeValues = this.AttributeValuesMap.get(attr.Id) || [];
    this.cancelValueForm();
  }

  getAttributeValuesList(attrId: number): any[] {
    return this.AttributeValuesMap.get(attrId) || [];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MASTER ATTRIBUTE ACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  openAddAttributeForm() {
    this.showValueForm = false; // Ensure child value form is hidden
    this.isAttributeEdit = false;
    this.selectedAttributeIdToEdit = null;
    this.ProductAttributeForm.reset();
    this.showAttributeForm = !this.showAttributeForm;
  }

  editAttribute(attr: any, event?: Event) {
    if (event) event.stopPropagation();
    this.showValueForm = false; // Ensure child value form is hidden
    this.isAttributeEdit = true;
    this.selectedAttributeIdToEdit = attr.Id;
    this.ProductAttributeForm.patchValue({
      AttributeNameCode: attr.AttributeNameCode,
      Name: attr.Name
    });
    this.showAttributeForm = true;
  }

  cancelAttributeForm() {
    this.showAttributeForm = false;
    this.isAttributeEdit = false;
    this.selectedAttributeIdToEdit = null;
    this.ProductAttributeForm.reset();
  }

  submitAttribute() {
    if (this.ProductAttributeForm.invalid) {
      this.ProductAttributeForm.markAllAsTouched();
      return;
    }
    const payload = {
      ...this.ProductAttributeForm.value,
      CompanyId: this.getCompanyId()
    };

    if (!this.isAttributeEdit) {
      this.commonService.postApi('product-attributes', payload).subscribe({
        next: () => {
          this.alert.success('Master Attribute Created Successfully');
          this.cancelAttributeForm();
          this.loadAllMasterData();
        },
        error: (err) => this.alert.error(err?.error?.message || 'Failed to create attribute')
      });
    } else {
      this.commonService.putApi(`product-attributes/${this.selectedAttributeIdToEdit}`, payload).subscribe({
        next: () => {
          this.alert.success('Master Attribute Updated Successfully');
          this.cancelAttributeForm();
          this.loadAllMasterData();
        },
        error: (err) => this.alert.error(err?.error?.message || 'Failed to update attribute')
      });
    }
  }

  deleteAttribute(attr: any, event?: Event) {
    if (event) event.stopPropagation();
    this.alert.confirm(`Are you sure you want to delete attribute "${attr.Name}" and all its values?`).then((res) => {
      if (res.isConfirmed) {
        this.commonService.deleteApi(`product-attributes/${attr.Id}`).subscribe({
          next: () => {
            this.alert.success('Attribute deleted successfully');
            if (this.selectedAttribute?.Id === attr.Id) {
              this.selectedAttribute = null;
            }
            this.loadAllMasterData();
          },
          error: (err) => this.alert.error(err?.error?.message || 'Failed to delete attribute')
        });
      }
    });
  }

  viewAttribute(attr: any, event?: Event) {
    if (event) event.stopPropagation();
    const vals = this.getAttributeValuesList(attr.Id);
    this.dialog.open(ViewDetailsDialog, {
      width: '580px',
      panelClass: 'premium-dialog-extended',
      data: {
        title: `Attribute: ${attr.Name}`,
        fields: [
          { label: 'Attribute Code', value: attr.AttributeNameCode },
          { label: 'Display Name', value: attr.Name },
          { label: 'Total Values Count', value: vals.length },
          { label: 'Sample Values', value: vals.map(v => v.Name).join(', ') || 'None' },
        ],
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHILD ATTRIBUTE VALUE ACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  openAddValueForm() {
    if (!this.selectedAttribute) {
      this.alert.warning('Please select a Master Attribute first!');
      return;
    }
    this.showAttributeForm = false; // Ensure parent attribute form is hidden
    this.isValueEdit = false;
    this.selectedValueIdToEdit = null;
    this.AttributeValueForm.reset({
      ProductAttributeId: this.selectedAttribute.Id,
      AttributeValueCode: '',
      Name: ''
    });
    this.showValueForm = !this.showValueForm;
  }

  editValue(val: any) {
    this.showAttributeForm = false; // Ensure parent attribute form is hidden
    this.isValueEdit = true;
    this.selectedValueIdToEdit = val.Id;
    this.AttributeValueForm.patchValue({
      ProductAttributeId: val.ProductAttributeId || this.selectedAttribute.Id,
      AttributeValueCode: val.AttributeValueCode,
      Name: val.Name
    });
    this.showValueForm = true;
  }

  cancelValueForm() {
    this.showValueForm = false;
    this.isValueEdit = false;
    this.selectedValueIdToEdit = null;
    this.AttributeValueForm.reset();
  }

  submitValue() {
    if (this.AttributeValueForm.invalid) {
      this.AttributeValueForm.markAllAsTouched();
      return;
    }
    const payload = {
      ...this.AttributeValueForm.value,
      CompanyId: this.getCompanyId()
    };

    if (!this.isValueEdit) {
      this.commonService.postApi('product-attribute-values', payload).subscribe({
        next: () => {
          this.alert.success(`Option value added to ${this.selectedAttribute?.Name}`);
          this.cancelValueForm();
          this.loadAllMasterData();
        },
        error: (err) => this.alert.error(err?.error?.message || 'Failed to add option value')
      });
    } else {
      this.commonService.putApi(`product-attribute-values/${this.selectedValueIdToEdit}`, payload).subscribe({
        next: () => {
          this.alert.success('Option value updated successfully');
          this.cancelValueForm();
          this.loadAllMasterData();
        },
        error: (err) => this.alert.error(err?.error?.message || 'Failed to update option value')
      });
    }
  }

  deleteValue(val: any) {
    this.alert.confirm(`Are you sure you want to delete option "${val.Name}"?`).then((res) => {
      if (res.isConfirmed) {
        this.commonService.deleteApi(`product-attribute-values/${val.Id}`).subscribe({
          next: () => {
            this.alert.success('Option value deleted successfully');
            this.loadAllMasterData();
          },
          error: (err) => this.alert.error(err?.error?.message || 'Failed to delete option value')
        });
      }
    });
  }
}

