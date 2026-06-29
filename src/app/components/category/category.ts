import { ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { environment } from 'src/environment/environment';

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
    MatTable
  ],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'name', header: 'Name' },
    { columnDef: 'description', header: 'Description' },
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
    private cdr: ChangeDetectorRef
  ) {
    this.CategoryForm = fb.group({
      name: ['', Validators.required],
      description: [''],
      parent_id: [null],
      StatusId: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.getCategories();
    this.getStatuses();
  }

  getCategories(onLoaded?: () => void) {
    this.commonService.getApi(`categories`).subscribe({
      next: (res: any) => {
        this.Categories = res?.data;
        onLoaded?.();
        this.cdr.detectChanges();
      }
    });
  }

  getStatuses() {
    this.commonService.getApi(`Status/All`).subscribe({
      next: (res: any) => {
        this.Statuses = res?.data?.data;
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
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.ImageFile = null;
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
  }

  AddNewUser() {
    this.Category_Forms = true;
  }

  editUser(category: any) {
    this.SelectedCategoryId = category?.id;
    this.Category_Forms = true;
    this.Update_button = true;
    this.existingImageUrl = category?.image ? `${environment.apiUrl}/${category.image}` : null;
    this.imagePreviewUrl = null;
    this.ImageFile = null;
    this.CategoryForm.patchValue({
      name: category?.name,
      description: category?.description,
      parent_id: category?.parent_id,
      StatusId: category?.StatusId
    });
  }

  deleteUser(category: any) {
    this.commonService.deleteApi(`categories/${category?.id}`).subscribe({
      next: (res: any) => {
        this.alert.success("Category deleted successfully");
        this.getCategories();
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
    const value = form.value;
    const formData = new FormData();
    formData.append('name', value.name);
    formData.append('description', value.description || '');
    if (value.parent_id) {
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
        }
      });
    } else {
      this.commonService.putApi(`categories/${this.SelectedCategoryId}`, formData).subscribe({
        next: (res: any) => {
          this.alert.success("Category Updated Successfully");
          this.getCategories(() => this.cancelCategory());
        }
      });
    }
  }
}
