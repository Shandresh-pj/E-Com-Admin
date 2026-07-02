import { ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { ViewDetailsDialog } from 'src/utils/view-details-dialog/view-details-dialog';

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
    MatTable
  ],
  templateUrl: './product-attribute.html',
  styleUrl: './product-attribute.scss',
})
export class ProductAttribute {
  tableColumns = [
    { columnDef: 'Id', header: 'No' },
    { columnDef: 'AttributeNameCode', header: 'Attribute Code' },
    { columnDef: 'Name', header: 'Name' },
  ];

  ProductAttributeForm: FormGroup;
  ProductAttribute_Forms: boolean = false;
  Update_button: boolean = false;
  ProductAttributes: any;
  SelectedProductAttributeId: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    public perm: PermissionService
  ) {
    this.ProductAttributeForm = fb.group({
      AttributeNameCode: ['', [Validators.required, Validators.maxLength(50)]],
      Name: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  ngOnInit() {
    this.getProductAttributes();
  }

  getCompanyId() {
    const user = this.authService.getUser();
    const roles = this.authService.getRoles();
    return user?.company_id || user?.CompanyId || roles?.[0]?.company?.id;
  }

  getProductAttributes() {
    this.commonService.getApi(`ProductAttribute/All`).subscribe({
      next: (res: any) => {
        this.ProductAttributes = res?.data?.data;
        this.cdr.detectChanges();
      }
    });
  }

  AddNewUser() {
    this.ProductAttribute_Forms = true;
  }

  editUser(attribute: any) {
    this.SelectedProductAttributeId = attribute?.Id;
    this.ProductAttribute_Forms = true;
    this.Update_button = true;
    this.ProductAttributeForm.patchValue({
      AttributeNameCode: attribute?.AttributeNameCode,
      Name: attribute?.Name
    });
  }

  viewItem(attribute: any) {
    this.commonService.getApi(`ProductAttribute/Detail/${attribute?.Id}`).subscribe({
      next: (res: any) => {
        const data = res?.data;
        this.dialog.open(ViewDetailsDialog, {
          width: '600px',
          data: {
            title: 'Product Attribute Details',
            fields: [
              { label: 'Attribute Code', value: data?.AttributeNameCode },
              { label: 'Name', value: data?.Name },
              { label: 'Created At', value: data?.CreatedAt },
              { label: 'Updated At', value: data?.UpdatedAt },
            ],
          },
        });
      }
    });
  }

  deleteUser(attribute: any) {
    this.alert.confirm("Are you sure you want to delete this product attribute?").then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`ProductAttribute/${attribute?.Id}`).subscribe({
          next: (res: any) => {
            this.alert.success("Product Attribute deleted successfully");
            this.getProductAttributes();
          }
        });
      }
    });
  }

  cancelProductAttribute() {
    this.ProductAttribute_Forms = false;
    this.Update_button = false;
    this.ProductAttributeForm.reset();
  }

  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const payload = {
      ...form.value,
      CompanyId: this.getCompanyId()
    };

    if (!this.Update_button) {
      this.commonService.postApi(`ProductAttribute/Add`, payload).subscribe({
        next: (res: any) => {
          this.alert.success("Product Attribute Created Successfully");
          this.refreshAndClose();
        }
      });
    } else {
      this.commonService.postApi(`ProductAttribute/Update/${this.SelectedProductAttributeId}`, payload).subscribe({
        next: (res: any) => {
          this.alert.success("Product Attribute Updated Successfully");
          this.refreshAndClose();
        }
      });
    }
  }

  private refreshAndClose() {
    this.commonService.getApi(`ProductAttribute/All`).subscribe({
      next: (res: any) => {
        this.ProductAttributes = res?.data?.data;
        this.cancelProductAttribute();
        this.cdr.detectChanges();
      }
    });
  }
}
