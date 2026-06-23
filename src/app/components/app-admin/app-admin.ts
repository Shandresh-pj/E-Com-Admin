import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatOption } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
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
    {
      columnDef: 'id',
      header: 'No'
    },
    {
      columnDef: 'name',
      header: 'Name'
    },
    {
      columnDef: 'email',
      header: 'Email'
    },
    {
      columnDef: 'phone',
      header: 'Mobile Number'
    },
    {
      columnDef: 'gst_number',
      header: 'GST Number'
    },
    
   
  ];

  Companies_Form : boolean = false;

  Update_Button : boolean = false;
  SelectedComapanyId: any;

constructor(private fb: FormBuilder, 
  private authService:AuthService,
  private commonService:CommonService,
  private alert:AlertService
){
  const user = this.authService.getUser();
  console.log("aaaa-1.1",user)

  this.CompanyForm = fb.group({
    name : ['', Validators.required],
    email : ['', [Validators.required, Validators.email]],
    phone : ['',Validators.required],
    address : [''],
    gst_number : ['']
  })
}

ngOnInit() {
  this.getUser();
}

AddNewUser(){
  this.Companies_Form = true;
  this.Update_Button = false;
}


cancelAdd(){
  this.getUser();
  this.Companies_Form = false;
  this.CompanyForm.reset();
}

cancelComapny(){
  this.CompanyForm.reset();
  this.Companies_Form = false;
}


getUser(){
  this.commonService.getApi('companies').subscribe({
    next:(res:any) => {
      this.Users = res?.data
      console.log('Users', this.Users)
    }
  })
}


editUser(user: any) {
  this.Companies_Form = true;
  this.Update_Button = true;
console.log("user",user)
  this.CompanyForm.patchValue({
    name: user?.name,
    email: user?.email,
    phone: user?.phone,
    address: user?.address,
    gst_number : user?.gst_number
  });

  this.SelectedComapanyId = user?.id
  console.log("id",this.SelectedComapanyId )

  // this.commonService.putApi('companies/{user?.id}',payload).subscribe({
  //   next:(res:any)=>{
  //     this.alert.success("Comapany Updated Successfully")
  //   }
  // })
}

deleteUser(user: any) {
  console.log('Delete User', user);
  this.SelectedComapanyId = user?.id
  this.commonService
    .deleteApi(`auth/delete/${this.SelectedComapanyId}`)
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





submit(form: FormGroup) {

  const payload = form.getRawValue();

  console.log(payload);

  if (this.Update_Button) {

    this.commonService
      .putApi(
        `companies/${this.SelectedComapanyId}`,
        payload
      )
      .subscribe({

        next: (res: any) => {

          this.alert.success(
            "Company Updated Successfully"
          );
          this.getUser();

          this.Update_Button = false;

          this.CompanyForm.reset();

          this.Companies_Form = false;

        },

        error: (err: any) => {
          console.log(err);
        }

      });

  }
  else {

    this.commonService
      .postApi(
        'companies',
        payload
      )
      .subscribe({

        next: (res: any) => {

          this.alert.success(
            "Company Created Successfully"
          );

          this.CompanyForm.reset();

          this.Companies_Form = false;

        }

      });

  }

}

}
