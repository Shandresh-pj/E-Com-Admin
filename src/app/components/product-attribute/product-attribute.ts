import { ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

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
    private cdr: ChangeDetectorRef
  ) {
    this.ProductAttributeForm = fb.group({
      AttributeNameCode: ['', Validators.required],
      Name: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.getProductAttributes();
  }

  getCompanyId() {
    const user = this.authService.getUser();
    return user?.company_id || user?.CompanyId || user?.userRoles?.[0]?.company?.id;
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

  deleteUser(attribute: any) {
    this.commonService.deleteApi(`ProductAttribute/${attribute?.Id}`).subscribe({
      next: (res: any) => {
        this.alert.success("Product Attribute deleted successfully");
        this.getProductAttributes();
      }
    });
  }

  cancelProductAttribute() {
    this.ProductAttribute_Forms = false;
    this.Update_button = false;
    this.ProductAttributeForm.reset();
  }

  submit(form: FormGroup) {
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
