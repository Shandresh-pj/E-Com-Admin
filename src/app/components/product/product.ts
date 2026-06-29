import { ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormArray, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-product',
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
  Statuses: any;
  ProductAttributes: any;
  AttributeValuesByRow: { [index: number]: any[] } = {};
  SelectedProductId: any;

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
    private cdr: ChangeDetectorRef
  ) {
    this.ProductForm = fb.group({
      name: ['', Validators.required],
      description: [''],
      category: [''],
      price: ['', Validators.required],
      stock_in_hand: ['', Validators.required],
      barcode: [''],
      product_type: ['simple', Validators.required],
      status: ['', Validators.required],
      variants: this.fb.array([])
    });
  }

  ngOnInit() {
    this.getProducts();
    this.getCategories();
    this.getStatuses();
    this.getProductAttributes();
  }

  get variants(): FormArray {
    return this.ProductForm.get('variants') as FormArray;
  }

  getCompanyId() {
    const user = this.authService.getUser();
    return user?.company_id || user?.CompanyId || user?.userRoles?.[0]?.company?.id;
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

  getStatuses() {
    this.commonService.getApi(`Status/All`, { StatusFor: 'PRODUCT' }).subscribe({
      next: (res: any) => {
        this.Statuses = res?.data?.data;
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

  getAttributeValuesForRow(attributeId: number, rowIndex: number) {
    if (!attributeId) {
      this.AttributeValuesByRow[rowIndex] = [];
      return;
    }
    this.commonService.getApi(`ProductAttributeValue/All`, { ProductAttributeId: attributeId }).subscribe({
      next: (res: any) => {
        this.AttributeValuesByRow[rowIndex] = res?.data?.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  onProductTypeChange(value: string) {
    if (value === 'variant') {
      if (this.variants.length === 0) {
        this.addVariant();
      }
    } else {
      this.variants.clear();
      this.AttributeValuesByRow = {};
    }
  }

  createVariant(data?: any): FormGroup {
    return this.fb.group({
      Id: [data?.Id || null],
      ProductAttributeId: [data?.ProductAttributeId || '', Validators.required],
      ProductAttributeValueId: [data?.ProductAttributeValueId || '', Validators.required],
      Barcode: [data?.Barcode || ''],
      Price: [data?.Price || '', Validators.required],
      Stock: [data?.Stock || '', Validators.required]
    });
  }

  addVariant() {
    const index = this.variants.length;
    this.variants.push(this.createVariant());
    this.AttributeValuesByRow[index] = [];
  }

  removeVariant(index: number) {
    this.variants.removeAt(index);
    delete this.AttributeValuesByRow[index];
  }

  detectImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.ImageFile = file;
      const reader = new FileReader();
      reader.onload = () => { this.imagePreviewUrl = reader.result as string; };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.ImageFile = null;
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
  }

  detectGalleryFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    files.forEach((file) => {
      this.GalleryFiles.push(file);
      const reader = new FileReader();
      reader.onload = () => { this.GalleryPreviews.push(reader.result as string); };
      reader.readAsDataURL(file);
    });
  }

  removeNewGalleryImage(index: number) {
    this.GalleryFiles.splice(index, 1);
    this.GalleryPreviews.splice(index, 1);
  }

  removeExistingGalleryImage(index: number) {
    this.ExistingGalleryImages.splice(index, 1);
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
    this.VideoFile = null;
    this.videoPreviewUrl = null;
    this.existingVideoUrl = null;
  }

  AddNewUser() {
    this.Product_Forms = true;
  }

  editUser(product: any) {
    this.SelectedProductId = product?.id;
    this.Product_Forms = true;
    this.Update_button = true;

    this.variants.clear();
    this.AttributeValuesByRow = {};

    this.existingImageUrl = product?.image ? `${environment.apiUrl}/${product.image}` : null;
    this.ExistingGalleryImages = product?.images || [];
    this.existingVideoUrl = product?.video ? `${environment.apiUrl}/${product.video}` : null;
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
      product.variants.forEach((variant: any, index: number) => {
        this.variants.push(this.createVariant(variant));
        this.getAttributeValuesForRow(variant?.ProductAttributeId, index);
      });
    }
  }

  deleteUser(product: any) {
    this.commonService.deleteApi(`products/${product?.id}`).subscribe({
      next: (res: any) => {
        this.alert.success("Product deleted successfully");
        this.getProducts();
      }
    });
  }

  cancelProduct() {
    this.Product_Forms = false;
    this.Update_button = false;
    this.variants.clear();
    this.AttributeValuesByRow = {};
    this.ImageFile = null;
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
    this.GalleryFiles = [];
    this.GalleryPreviews = [];
    this.ExistingGalleryImages = [];
    this.VideoFile = null;
    this.videoPreviewUrl = null;
    this.existingVideoUrl = null;
    this.ProductForm.reset({ product_type: 'simple' });
  }

  submit(form: FormGroup) {
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
    formData.append('registration_id', this.getCompanyId() || '');

    if (value.product_type === 'variant') {
      formData.append('variants', JSON.stringify(value.variants));
    }

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
