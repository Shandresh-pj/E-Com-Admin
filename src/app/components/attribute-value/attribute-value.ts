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
  selector: 'app-attribute-value',
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
  templateUrl: './attribute-value.html',
  styleUrl: './attribute-value.scss',
})
export class AttributeValue {
  tableColumns = [
    { columnDef: 'Id', header: 'No' },
    { columnDef: 'AttributeName', header: 'Attribute' },
    { columnDef: 'AttributeValueCode', header: 'Value Code' },
    { columnDef: 'Name', header: 'Name' },
  ];

  AttributeValueForm: FormGroup;
  AttributeValue_Forms: boolean = false;
  Update_button: boolean = false;
  AttributeValues: any;
  ProductAttributes: any;
  SelectedAttributeValueId: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef
  ) {
    this.AttributeValueForm = fb.group({
      ProductAttributeId: ['', Validators.required],
      AttributeValueCode: ['', Validators.required],
      Name: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.getProductAttributes();
    this.getAttributeValues();
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

  getAttributeValues(onLoaded?: () => void) {
    this.commonService.getApi(`ProductAttributeValue/All`).subscribe({
      next: (res: any) => {
        const values = res?.data?.data || [];
        this.AttributeValues = values.map((value: any) => ({
          ...value,
          AttributeName: this.ProductAttributes?.find((attr: any) => attr.Id === value.ProductAttributeId)?.Name
        }));
        onLoaded?.();
        this.cdr.detectChanges();
      }
    });
  }

  AddNewUser() {
    this.AttributeValue_Forms = true;
  }

  editUser(value: any) {
    this.SelectedAttributeValueId = value?.Id;
    this.AttributeValue_Forms = true;
    this.Update_button = true;
    this.AttributeValueForm.patchValue({
      ProductAttributeId: value?.ProductAttributeId,
      AttributeValueCode: value?.AttributeValueCode,
      Name: value?.Name
    });
  }

  deleteUser(value: any) {
    this.commonService.deleteApi(`ProductAttributeValue/${value?.Id}`).subscribe({
      next: (res: any) => {
        this.alert.success("Attribute Value deleted successfully");
        this.getAttributeValues();
      }
    });
  }

  cancelAttributeValue() {
    this.AttributeValue_Forms = false;
    this.Update_button = false;
    this.AttributeValueForm.reset();
  }

  submit(form: FormGroup) {
    const payload = {
      ...form.value,
      CompanyId: this.getCompanyId()
    };

    if (!this.Update_button) {
      this.commonService.postApi(`ProductAttributeValue/Add`, payload).subscribe({
        next: (res: any) => {
          this.alert.success("Attribute Value Created Successfully");
          this.getAttributeValues(() => this.cancelAttributeValue());
        }
      });
    } else {
      this.commonService.postApi(`ProductAttributeValue/Update/${this.SelectedAttributeValueId}`, payload).subscribe({
        next: (res: any) => {
          this.alert.success("Attribute Value Updated Successfully");
          this.getAttributeValues(() => this.cancelAttributeValue());
        }
      });
    }
  }
}
