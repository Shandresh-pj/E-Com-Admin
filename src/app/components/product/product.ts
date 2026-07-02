import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormArray, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { toFileUrl } from 'src/utils/file-url';
import { ViewDetailsDialog } from 'src/utils/view-details-dialog/view-details-dialog';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatIconModule,
    MatTable
  ],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'name', header: 'Name' },
    { columnDef: 'price', header: 'Price' },
    { columnDef: 'stock_in_hand', header: 'Stock' },
    { columnDef: 'product_type', header: 'Type' },
    { columnDef: 'status', header: 'Status' },
  ];

  ProductForm: FormGroup;
  Product_Forms: boolean = false;
  Update_button: boolean = false;
  Products: any;
  Categories: any;
  ProductAttributes: any;
  AttributeValuesByAttr: { [attributeId: number]: any[] } = {};
  SelectedAttrValues: { [attributeId: number]: number[] } = {};
  SavedVariantDataMap: { [key: string]: any } = {};
  SingleAttrValuesByRow: { [index: number]: any[] } = {};
  SelectedProductId: any;
  SelectedVariantAttributeIds: number[] = [];

  ImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  existingImageUrl: string | null = null;

  GalleryFiles: File[] = [];
  GalleryPreviews: string[] = [];
  ExistingGalleryImages: string[] = [];

  VideoFile: File | null = null;
  videoPreviewUrl: string | null = null;
  existingVideoUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    public perm: PermissionService
  ) {
    this.ProductForm = fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(1000)],
      category: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      stock_in_hand: ['', [Validators.required, Validators.min(0)]],
      barcode: ['', Validators.pattern(/^\d{8,14}$/)],
      product_type: ['single', Validators.required],
      status: ['', Validators.required],
      variants: this.fb.array([]),
      attributeValues: this.fb.array([]),
    });
  }

  ngOnInit() {
    this.getProducts();
    this.getCategories();
    this.getProductAttributes();
  }

  get variants(): FormArray {
    return this.ProductForm.get('variants') as FormArray;
  }

  get attributeValues(): FormArray {
    return this.ProductForm.get('attributeValues') as FormArray;
  }


  toFileUrl(path: string | null | undefined): string | null {
    return toFileUrl(path);
  }

  getRegistrationId() {
    const user = this.authService.getUser();
    return user?.id;
  }

  getProducts(onLoaded?: () => void) {
    this.commonService.getApi(`products`).subscribe({
      next: (res: any) => {
        this.Products = res?.data;
        onLoaded?.();
        this.cdr.detectChanges();
      }
    });
  }

  getCategories() {
    this.commonService.getApi(`categories`).subscribe({
      next: (res: any) => {
        this.Categories = res?.data;
        this.cdr.detectChanges();
      }
    });
  }

  getProductAttributes() {
    this.commonService.getApi(`ProductAttribute/All`).subscribe({
      next: (res: any) => {
        this.ProductAttributes = res?.data?.data;
        this.cdr.detectChanges();
      }
    });
  }


  loadAllAttributeValues() {
    if (!this.ProductAttributes?.length) return;
    this.ProductAttributes.forEach((attr: any) => {
      if (this.AttributeValuesByAttr[attr.Id]) return;
      this.commonService.getApi(`ProductAttributeValue/All`, { ProductAttributeId: attr.Id }).subscribe({
        next: (res: any) => {
          this.AttributeValuesByAttr[attr.Id] = res?.data?.data || [];
          this.cdr.detectChanges();
        }
      });
    });
  }

  getSelectedValuesForAttr(attributeId: number): number[] {
    return this.SelectedAttrValues[attributeId] || [];
  }

  onAttrValueChange(attributeId: number, selectedIds: number[]) {
    this.SelectedAttrValues[attributeId] = selectedIds;
    if (this.ProductForm.get('product_type')?.value === 'variant') {
      this.regenerateVariantsFromSelection();
    }
  }

  onSingleAttrRowChange(attrId: number, rowIndex: number) {
    const row = this.attributeValues.at(rowIndex);
    row?.get('ProductAttributeValueId')?.setValue(null);
    this.SingleAttrValuesByRow[rowIndex] = [];
    if (!attrId) return;
    this.commonService.getApi(`ProductAttributeValue/All`, { ProductAttributeId: attrId }).subscribe({
      next: (res: any) => {
        this.SingleAttrValuesByRow[rowIndex] = res?.data?.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  addAttrValueRow() {
    const index = this.attributeValues.length;
    this.attributeValues.push(this.fb.group({
      ProductAttributeId: [null],
      ProductAttributeValueId: [null]
    }));
    this.SingleAttrValuesByRow[index] = [];
    this.cdr.detectChanges();
  }

  removeAttrValueRow(index: number) {
    this.alert.confirm("Are you sure you want to remove this attribute?").then((result) => {
      if (result.isConfirmed) {
        this.attributeValues.removeAt(index);
        delete this.SingleAttrValuesByRow[index];
        // Re-index remaining rows
        const newMap: { [index: number]: any[] } = {};
        Object.entries(this.SingleAttrValuesByRow).forEach(([k, v]) => {
          const i = Number(k);
          newMap[i > index ? i - 1 : i] = v;
        });
        this.SingleAttrValuesByRow = newMap;
        this.cdr.detectChanges();
      }
    });
  }

  /** Returns attributes not already selected in other rows (current row's own value is always included). */
  getAvailableAttributes(rowIndex: number): any[] {
    if (!this.ProductAttributes) return [];
    const usedIds = new Set<number>();
    this.attributeValues.controls.forEach((ctrl, i) => {
      if (i !== rowIndex) {
        const val = ctrl.get('ProductAttributeId')?.value;
        if (val) usedIds.add(val);
      }
    });
    return this.ProductAttributes.filter((attr: any) => !usedIds.has(attr.Id));
  }

  get allAttributesUsed(): boolean {
    const total = this.ProductAttributes?.length || 0;
    const used = this.attributeValues.controls.filter(
      ctrl => ctrl.get('ProductAttributeId')?.value
    ).length;
    return used >= total;
  }

  regenerateVariantsFromSelection() {
    this.variants.clear();
    Object.entries(this.SelectedAttrValues).forEach(([attrId, valueIds]) => {
      (valueIds as number[]).forEach((valueId: number) => {
        const key = `${attrId}_${valueId}`;
        const saved = this.SavedVariantDataMap[key];
        this.variants.push(this.fb.group({
          Id: [saved?.Id || null],
          ProductAttributeId: [Number(attrId), Validators.required],
          ProductAttributeValueId: [valueId, Validators.required],
          Barcode: [saved?.Barcode || ''],
          Price: [saved?.Price ?? '', Validators.required],
          Stock: [saved?.Stock ?? '', Validators.required]
        }));
      });
    });
  }

  getAttrName(attrId: number): string {
    return this.ProductAttributes?.find((a: any) => a.Id === attrId)?.Name || '';
  }

  getAttrValueName(attrId: number, valueId: number): string {
    return this.AttributeValuesByAttr[attrId]?.find((v: any) => v.Id === valueId)?.Name || '';
  }

  getVariantCombinationLabel(variant: any): string {
    const attrId = variant.get('ProductAttributeId')?.value;
    const valueId = variant.get('ProductAttributeValueId')?.value;
    const attrName = this.getAttrName(attrId);
    const valueName = this.getAttrValueName(attrId, valueId);
    return attrName && valueName ? `${attrName}: ${valueName}` : (attrName || valueName || '');
  }

  onVariantAttributeChange(selectedAttrIds: number[]) {
    this.SelectedVariantAttributeIds = selectedAttrIds;
    selectedAttrIds.forEach(attrId => {
      if (!this.AttributeValuesByAttr[attrId]) {
        this.commonService.getApi(`ProductAttributeValue/All`, { ProductAttributeId: attrId }).subscribe({
          next: (res: any) => {
            this.AttributeValuesByAttr[attrId] = res?.data?.data || [];
            this.cdr.detectChanges();
          }
        });
      }
    });
    Object.keys(this.SelectedAttrValues).forEach(key => {
      if (!selectedAttrIds.includes(Number(key))) {
        delete this.SelectedAttrValues[Number(key)];
      }
    });
    this.regenerateVariantsFromSelection();
  }

  getVariantValueSelectionKeys(): string[] {
    const keys: string[] = [];
    Object.entries(this.SelectedAttrValues).forEach(([attrId, valueIds]) => {
      (valueIds as number[]).forEach(valueId => keys.push(`${attrId}:${valueId}`));
    });
    return keys;
  }

  onVariantValueChange(selectedKeys: string[]) {
    this.SelectedAttrValues = {};
    selectedKeys.forEach(key => {
      const [attrIdStr, valueIdStr] = key.split(':');
      const attrId = Number(attrIdStr);
      const valueId = Number(valueIdStr);
      if (!this.SelectedAttrValues[attrId]) this.SelectedAttrValues[attrId] = [];
      this.SelectedAttrValues[attrId].push(valueId);
    });
    this.regenerateVariantsFromSelection();
  }

  onProductTypeChange(value: string) {
    if (value === 'variant') {
      this.variants.clear();
      this.SelectedAttrValues = {};
      this.SavedVariantDataMap = {};
      this.SelectedVariantAttributeIds = [];
      this.attributeValues.clear();
      this.SingleAttrValuesByRow = {};
      this.addAttrValueRow();
    } else {
      this.variants.clear();
      this.SelectedAttrValues = {};
      this.SelectedVariantAttributeIds = [];
      this.attributeValues.clear();
      this.SingleAttrValuesByRow = {};
      this.addAttrValueRow();
    }
  }


  detectImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.ImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.alert.confirm("Are you sure you want to remove the main image?").then((result) => {
      if (result.isConfirmed) {
        this.ImageFile = null;
        this.imagePreviewUrl = null;
        this.existingImageUrl = null;
      }
    });
  }

  detectGalleryFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    files.forEach((file) => {
      this.GalleryFiles.push(file);
      const reader = new FileReader();
      reader.onload = () => {
        this.GalleryPreviews.push(reader.result as string);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    });
  }

  removeNewGalleryImage(index: number) {
    this.alert.confirm("Are you sure you want to remove this new gallery image?").then((result) => {
      if (result.isConfirmed) {
        this.GalleryFiles.splice(index, 1);
        this.GalleryPreviews.splice(index, 1);
      }
    });
  }

  removeExistingGalleryImage(index: number) {
    this.alert.confirm("Are you sure you want to remove this gallery image?").then((result) => {
      if (result.isConfirmed) {
        this.ExistingGalleryImages.splice(index, 1);
      }
    });
  }

  detectVideo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.VideoFile = file;
      this.videoPreviewUrl = URL.createObjectURL(file);
    }
  }

  removeVideo() {
    this.alert.confirm("Are you sure you want to remove the video?").then((result) => {
      if (result.isConfirmed) {
        this.VideoFile = null;
        this.videoPreviewUrl = null;
        this.existingVideoUrl = null;
      }
    });
  }

  AddNewUser() {
    this.Product_Forms = true;
    this.addAttrValueRow();
  }

  editUser(product: any) {
    this.SelectedProductId = product?.id;
    this.Product_Forms = true;
    this.Update_button = true;

    this.variants.clear();
    this.attributeValues.clear();
    this.SelectedAttrValues = {};
    this.SavedVariantDataMap = {};
    this.SingleAttrValuesByRow = {};

    this.existingImageUrl = toFileUrl(product?.image);
    this.ExistingGalleryImages = product?.images || [];
    this.existingVideoUrl = toFileUrl(product?.video);
    this.ImageFile = null;
    this.imagePreviewUrl = null;
    this.GalleryFiles = [];
    this.GalleryPreviews = [];
    this.VideoFile = null;
    this.videoPreviewUrl = null;

    this.ProductForm.patchValue({
      name: product?.name,
      description: product?.description,
      category: product?.category,
      price: product?.price,
      stock_in_hand: product?.stock_in_hand,
      barcode: product?.barcode,
      product_type: product?.product_type,
      status: product?.status
    });

    if (product?.product_type === 'variant' && product?.variants?.length) {
      // Rebuild SelectedAttrValues and SavedVariantDataMap from existing variants
      this.SavedVariantDataMap = {};
      product.variants.forEach((v: any) => {
        const attrId = v?.ProductAttributeId;
        const valId = v?.ProductAttributeValueId;
        if (!attrId || !valId) return;
        const key = `${attrId}_${valId}`;
        this.SavedVariantDataMap[key] = { Id: v.Id, Price: v.Price, Stock: v.Stock, Barcode: v.Barcode };
        if (!this.SelectedAttrValues[attrId]) {
          this.SelectedAttrValues[attrId] = [];
        }
        this.SelectedAttrValues[attrId].push(valId);
      });
      this.SelectedVariantAttributeIds = Object.keys(this.SelectedAttrValues).map(Number);
      this.loadAllAttributeValues();
      this.regenerateVariantsFromSelection();
    }

    const extraAttrs: any[] = product?.Attributes || [];

    if (extraAttrs.length) {
      extraAttrs.forEach((av: any, index: number) => {
        this.attributeValues.push(this.fb.group({
          ProductAttributeId: [av?.ProductAttributeId || null],
          ProductAttributeValueId: [av?.ProductAttributeValueId || null]
        }));
        this.SingleAttrValuesByRow[index] = [];
        if (av?.ProductAttributeId) {
          this.onSingleAttrRowChange(av.ProductAttributeId, index);
          // Restore selected value after options load asynchronously
          const restoreValId = av?.ProductAttributeValueId;
          const row = this.attributeValues.at(index);
          setTimeout(() => { row?.get('ProductAttributeValueId')?.setValue(restoreValId); this.cdr.detectChanges(); }, 300);
        }
      });
    } else {
      // Always show at least one empty row
      this.addAttrValueRow();
    }
  }

  viewItem(product: any) {
    this.commonService.getApi(`products/${product?.id}`).subscribe({
      next: (res: any) => {
        const data = res?.data;
        const galleryUrls = (data?.images || []).map((img: string) => toFileUrl(img));
        const variantsSummary = (data?.variants || [])
          .map((v: any) => `${v?.ProductAttribute?.Name ?? ''}: ${v?.ProductAttributeValue?.Name ?? ''} (Stock ${v?.Stock ?? 0}, Price ${v?.Price ?? 0})`)
          .join(' | ');
        const attributesSummary = (data?.Attributes || [])
          .map((a: any) => `${a?.AttributeName ?? ''}: ${a?.AttributeValue ?? ''}`)
          .join(' | ');

        const fields: any[] = [
          { label: 'Name', value: data?.name },
          { label: 'Description', value: data?.description },
          { label: 'Category', value: data?.category },
          { label: 'Price', value: data?.price },
          { label: 'Stock In Hand', value: data?.stock_in_hand },
          { label: 'Barcode', value: data?.barcode },
          { label: 'Product Type', value: data?.product_type },
          { label: 'Status', value: data?.status },
        ];

        if (data?.product_type !== 'single') {
          fields.push({ label: 'Variants', value: variantsSummary || undefined });
        }

        fields.push(
          { label: 'Attributes', value: attributesSummary || undefined },
          { label: 'Image', value: toFileUrl(data?.image), isImage: true },
          { label: 'Gallery Images', value: galleryUrls, isImageList: true },
          { label: 'Video', value: toFileUrl(data?.video), isVideo: true }
        );

        this.dialog.open(ViewDetailsDialog, {
          width: '700px',
          data: {
            title: 'Product Details',
            fields: fields,
          },
        });
      }
    });
  }

  deleteUser(product: any) {
    this.alert.confirm("Are you sure you want to delete this product?").then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`products/${product?.id}`).subscribe({
          next: (res: any) => {
            this.alert.success("Product deleted successfully");
            this.getProducts();
          }
        });
      }
    });
  }

  cancelProduct() {
    this.Product_Forms = false;
    this.Update_button = false;
    this.variants.clear();
    this.attributeValues.clear();
    this.SelectedAttrValues = {};
    this.SavedVariantDataMap = {};
    this.SelectedVariantAttributeIds = [];
    this.SingleAttrValuesByRow = {};
    this.ImageFile = null;
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
    this.GalleryFiles = [];
    this.GalleryPreviews = [];
    this.ExistingGalleryImages = [];
    this.VideoFile = null;
    this.videoPreviewUrl = null;
    this.existingVideoUrl = null;
    this.ProductForm.reset({ product_type: 'single' });
  }

  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const value = form.value;
    const formData = new FormData();
    formData.append('name', value.name);
    formData.append('description', value.description || '');
    formData.append('category', value.category || '');
    formData.append('price', value.price);
    formData.append('stock', value.stock_in_hand);
    formData.append('stock_in_hand', value.stock_in_hand);
    formData.append('barcode', value.barcode || '');
    formData.append('product_type', value.product_type);
    formData.append('status', value.status);
    formData.append('registration_id', this.getRegistrationId() || '');

    formData.append('variants', JSON.stringify(value.product_type === 'variant' ? value.variants : []));

    // Build attribute_values from FormArray — applies to both single and variant
    const attrValuePairs: { ProductAttributeId: number; ProductAttributeValueId: number }[] = [];
    (value.attributeValues || []).forEach((av: any) => {
      if (av?.ProductAttributeId && av?.ProductAttributeValueId) {
        attrValuePairs.push({
          ProductAttributeId: av.ProductAttributeId,
          ProductAttributeValueId: av.ProductAttributeValueId
        });
      }
    });
    formData.append('attribute_values', JSON.stringify(attrValuePairs));

    if (this.ImageFile) {
      formData.append('image', this.ImageFile);
    }
    this.GalleryFiles.forEach((file) => formData.append('images', file));
    if (this.Update_button) {
      formData.append('existing_images', JSON.stringify(this.ExistingGalleryImages));
    }
    if (this.VideoFile) {
      formData.append('video', this.VideoFile);
    }

    if (!this.Update_button) {
      this.commonService.postApi(`products/add`, formData).subscribe({
        next: (res: any) => {
          this.alert.success("Product Created Successfully");
          this.getProducts(() => this.cancelProduct());
        }
      });
    } else {
      this.commonService.putApi(`products/${this.SelectedProductId}`, formData).subscribe({
        next: (res: any) => {
          this.alert.success("Product Updated Successfully");
          this.getProducts(() => this.cancelProduct());
        }
      });
    }
  }
}
