import { ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatOption } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { PHONE_PATTERN, GST_PATTERN } from 'src/utils/app-validators';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-app-admin',
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
  templateUrl: './app-admin.html',
  styleUrl: './app-admin.scss',
})
export class AppAdmin {

  CompanyForm : FormGroup
  user : any;
  roles:any;
  Users: any;

  tableColumns = [
    { columnDef: 'id',         header: 'No'            },
    { columnDef: 'name',       header: 'Name'          },
    { columnDef: 'email',      header: 'Email'         },
    { columnDef: 'phone',      header: 'Mobile Number' },
    { columnDef: 'gst_number', header: 'GST Number'    },
    { columnDef: 'userType',   header: 'Admin Type', type: 'badge' },
  ];

  readonly adminTypes = [
    { value: 'Admin',          label: 'Admin (Standard)' },
    { value: 'Hospital_Admin', label: 'Hospital Admin (Healthcare ERP)' },
  ];

  Companies_Form : boolean = false;
  View_Mode : boolean = false;

  Update_Button : boolean = false;

  SelectedComapanyId: any;
  SelectedCompany: any = null;
  Roles: any;
  Roleid: any;

constructor(private fb: FormBuilder,
  private authService:AuthService,
  private commonService:CommonService,
  private alert:AlertService,
  private cdr: ChangeDetectorRef,
  public perm: PermissionService
){
  const user = this.authService.getUser();
  this.CompanyForm = fb.group({
    adminType:          ['Admin', Validators.required],
    name:               ['', Validators.required],
    email:              ['', [Validators.required, Validators.email]],
    phone:              ['', Validators.required],
    address:            [''],
    gst_number:         [''],
    role_id:            [{value: '', disabled: true}, Validators.required],
    razorpay_key_id:    [''],
    razorpay_key_secret:['']
  });

  // When admin type changes -> auto-set role
  this.CompanyForm.get('adminType')?.valueChanges.subscribe((type: string) => {
    this.applyAdminRoleLock(type);
  });
}

ngOnInit() {
  this.getUser();
  this.getRoles();
}

/** Auto-set role_id to match Admin Type */
applyAdminRoleLock(type: string): void {
  const roleControl = this.CompanyForm.get('role_id');
  if (!roleControl || !this.Roles) return;
  const targetName = type === 'Hospital_Admin' ? 'Hospital_Admin' : 'Admin';
  const match = this.Roles.find((r: any) => r.name === targetName || r.name?.toLowerCase() === targetName.toLowerCase());
  if (match) roleControl.setValue(match.id);
  this.cdr.detectChanges();
}

get isHospitalAdmin(): boolean {
  return this.CompanyForm.get('adminType')?.value === 'Hospital_Admin';
}


AddNewUser(){
  this.getRoles();
  this.Companies_Form = true;
  this.View_Mode = false;
  this.Update_Button = false;
}

viewUser(user: any) {
  this.SelectedCompany = user;
  this.View_Mode = true;
  this.Companies_Form = false;
}

closeView() {
  this.View_Mode = false;
  this.SelectedCompany = null;
}


cancelAdd(){
  this.Companies_Form = false;
  this.CompanyForm.reset({ adminType: 'Admin' });
  this.applyAdminRoleLock('Admin');
  this.getUser();
}

cancelComapny(){
  this.CompanyForm.reset();
  this.Companies_Form = false;
}


getUser(){
  this.commonService.getApi('companies').subscribe({
    next:(res:any) => {
      this.Users = res?.data;
      this.cdr.detectChanges();
    }
  })
}

getRoles(){
  this.commonService.getApi(`roles`).subscribe({
    next:(res:any)=>{
      this.Roles = res?.data
      // Apply lock based on current admin type
      const currentType = this.CompanyForm.get('adminType')?.value || 'Admin';
      this.applyAdminRoleLock(currentType);
    }
  })
}


editUser(user: any) {
  this.Companies_Form = true;
  this.View_Mode = false;
  this.Update_Button = true;
  this.Roleid = user?.userRoles[0]?.role?.id;

  // Detect adminType from stored userType
  const storedType = user?.userType || 'Admin';
  const adminType = storedType === 'Hospital_Admin' ? 'Hospital_Admin' : 'Admin';

  this.CompanyForm.patchValue({
    adminType,
    name: user?.name,
    email: user?.email,
    phone: user?.phone,
    address: user?.address,
    gst_number: user?.gst_number,
    role_id: this.Roleid,
    razorpay_key_id: user?.razorpay_key_id || '',
    razorpay_key_secret: user?.razorpay_key_secret || ''
  });

  this.SelectedComapanyId = user?.id;
}

deleteUser(user: any) {
  const id = user?.id || this.SelectedComapanyId;
  this.alert.confirm("Are you sure you want to delete this admin/company?").then((result) => {
    if (result.isConfirmed) {
      this.commonService
        .deleteApi(`companies/${id}`)
        .subscribe({
          next: (res: any) => {
            this.alert.success(
              "Admin deleted successfully"
            );
            this.getUser();
          },
          error: (err: any) => {
            console.log(err);
            this.alert.error("Failed to delete admin");
          }
        });
    }
  });
} 





submit(form: FormGroup) {
  if (form.invalid) {
    form.markAllAsTouched();
    return;
  }

  const payload = form.getRawValue();

  console.log(payload);

  if (this.Update_Button) {this.commonService.putApi(`companies/${this.SelectedComapanyId}`,payload).subscribe({
next: (res: any) => {this.alert.success("Company Updated Successfully");
          this.getUser();
          this.getRoles();

          this.Update_Button = false;

          this.CompanyForm.reset();

          this.Companies_Form = false;

        },

        error: (err: any) => {console.log(err);}

      });

  } else {

    this.commonService.postApi('companies',payload).subscribe({
        next: (res: any) => {

          this.alert.success("Company Created Successfully");

          this.CompanyForm.reset();
          this.getRoles();
          this.getUser();

          this.Companies_Form = false;

        }

      });

  }

}

}
