import { ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { toFileUrl } from 'src/utils/file-url';
import { ViewDetailsDialog } from 'src/utils/view-details-dialog/view-details-dialog';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

@Component({
  selector: 'app-category',
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
    MatTable,
    AppTranslatePipe
  ],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'name', header: 'Name' },
    { columnDef: 'parentName', header: 'Parent' },
    { columnDef: 'description', header: 'Description' },
    { columnDef: 'statusText', header: 'Status', type: 'badge' },
  ];

  CategoryForm: FormGroup;
  Category_Forms: boolean = false;
  Update_button: boolean = false;
  Categories: any;
  Statuses: any;
  SelectedCategoryId: any;
  ImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  existingImageUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    public perm: PermissionService
  ) {
    this.CategoryForm = fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      parent_id: [null],
      StatusId: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.getStatuses();
    this.getCategories();
  }

  getCategories(onLoaded?: () => void) {
    this.commonService.getApi(`categories`).subscribe({
      next: (res: any) => {
        const rawList = res?.data || [];
        this.Categories = rawList.map((c: any) => {
          const statusObj = this.Statuses?.find((s: any) => s.Id === c.StatusId);
          return {
            ...c,
            parentName: c?.parent?.name || 'Root',
            statusText: statusObj ? statusObj.StatusCode : (c?.status ? 'Active' : 'Inactive')
          };
        });
        onLoaded?.();
        this.cdr.detectChanges();
      }
    });
  }

  getStatuses() {
    this.commonService.getApi(`Status/All`).subscribe({
      next: (res: any) => {
        this.Statuses = res?.data?.data;
        if (this.Categories) {
          this.Categories = this.Categories.map((c: any) => {
            const statusObj = this.Statuses?.find((s: any) => s.Id === c.StatusId);
            return {
              ...c,
              statusText: statusObj ? statusObj.StatusCode : (c?.status ? 'Active' : 'Inactive')
            };
          });
        }
        this.cdr.detectChanges();
      }
    });
  }

  detectFiles(event: Event) {
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
    this.alert.confirm("Are you sure you want to remove the category image?").then((result) => {
      if (result.isConfirmed) {
        this.ImageFile = null;
        this.imagePreviewUrl = null;
        this.existingImageUrl = null;
      }
    });
  }

  AddNewUser() {
    this.Category_Forms = true;
  }

  editUser(category: any) {
    this.SelectedCategoryId = category?.id;
    this.Category_Forms = true;
    this.Update_button = true;
    this.existingImageUrl = toFileUrl(category?.image);
    this.imagePreviewUrl = null;
    this.ImageFile = null;
    this.CategoryForm.patchValue({
      name: category?.name,
      description: category?.description,
      parent_id: category?.parent_id,
      StatusId: category?.StatusId
    });
  }

  viewItem(category: any) {
    this.commonService.getApi(`categories/${category?.id}`).subscribe({
      next: (res: any) => {
        const data = res?.data;
        const status = this.Statuses?.find((s: any) => s.Id === data?.StatusId);
        this.dialog.open(ViewDetailsDialog, {
          width: '600px',
          panelClass: 'premium-dialog-extended',
          data: {
            title: 'Category Details',
            fields: [
              { label: 'Name', value: data?.name },
              { label: 'Description', value: data?.description },
              { label: 'Parent Category', value: data?.parent?.name || 'Root' },
              { label: 'Status', value: status?.StatusCode || (data?.status ? 'Active' : 'Inactive') },
              { label: 'Image', value: toFileUrl(data?.image), isImage: true },
            ],
          },
        });
      }
    });
  }

  deleteUser(category: any) {
    this.alert.confirm("Are you sure you want to delete this category?").then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`categories/${category?.id}`).subscribe({
          next: (res: any) => {
            this.alert.success("Category deleted successfully");
            this.getCategories();
          },
          error: (err: any) => {
            this.alert.error(err?.error?.message || "Failed to delete category");
          }
        });
      }
    });
  }

  cancelCategory() {
    this.Category_Forms = false;
    this.Update_button = false;
    this.ImageFile = null;
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
    this.CategoryForm.reset();
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
    if (value.parent_id !== null && value.parent_id !== undefined && value.parent_id !== '') {
      formData.append('parent_id', value.parent_id);
    }
    formData.append('StatusId', value.StatusId);
    if (this.ImageFile) {
      formData.append('image', this.ImageFile);
    }

    if (!this.Update_button) {
      this.commonService.postApi(`categories/create`, formData).subscribe({
        next: (res: any) => {
          this.alert.success("Category Created Successfully");
          this.getCategories(() => this.cancelCategory());
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || "Failed to create category");
        }
      });
    } else {
      this.commonService.putApi(`categories/${this.SelectedCategoryId}`, formData).subscribe({
        next: (res: any) => {
          this.alert.success("Category Updated Successfully");
          this.getCategories(() => this.cancelCategory());
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || "Failed to update category");
        }
      });
    }
  }
}
