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
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { PHONE_PATTERN } from 'src/utils/app-validators';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-branch',
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
  templateUrl: './branch.html',
  styleUrl: './branch.scss',
})
export class Branch {
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
      columnDef: 'status',
      header: 'Status',
    },
  ];

  BranchForm : FormGroup;
  Branch_Forms : boolean = false;
  View_Mode : boolean = false;
  Update_button : boolean = false;
  Branch: any;
  Companies: any;
  SelectedBranchId: any;
  SelectedBranch: any = null;
  Roles: any;
  Roleid: any;
  defaultRole: any;
  constructor(
    private fb:FormBuilder,
    private authService:AuthService,
    private commonService:CommonService,
    private alert:AlertService,
    public perm: PermissionService
  ){
    this.BranchForm = fb.group({
      company_id : ['',Validators.required],
      name : ['',Validators.required],
      email : ['',[Validators.required, Validators.email]],
      phone : ['', Validators.required],
      location : [''],
      role_id:[{value:'', disabled:true},Validators.required]
    })
  }

  ngOnInit(){
    this.getRoles();
    this.getBranches();
    this.getCompanies();
  }
  getRoles(){
    this.commonService.getApi(`roles`).subscribe({
      next:(res:any)=> {
        this.Roles = res?.data
       this.defaultRole = this.Roles.find(
          (x:any)=>x.name==="Branch"
        );
        if (this.defaultRole) {
          this.BranchForm.get('role_id')?.setValue(this.defaultRole.id);
        }
      }
    })
  }

  getBranches(){
    this.commonService.getApi(`branches`).subscribe({
      next:(res:any)=> {
        this.Branch = res?.data.map((item: any) => ({
          ...item,
          status: item.userRoles?.[0]?.user?.status || '-'
        }));
      }
    })
  }
  getCompanies() {
    this.commonService.getApi('companies').subscribe({
        next: (res: any) => {
          if (res?.status === 200 || res?.success) {
            this.Companies = res?.data; 
          }
        },
        error: (err: any) => {
          console.log('Error:',err); 
        } 
      });
  }

  AddNewUser(){
    this.Branch_Forms = true;
    this.View_Mode = false;
    this.getRoles();
  }

  viewUser(user: any) {
    this.SelectedBranch = user;
    this.View_Mode = true;
    this.Branch_Forms = false;
  }

  closeView() {
    this.View_Mode = false;
    this.SelectedBranch = null;
  }

  editUser(user:any){
    console.log("user",user);
    this.SelectedBranchId = user?.id
    this.Branch_Forms =true
    this.Update_button =true
    this.Roleid = user?.userRoles[0]?.role?.id
    console.log("roleid",this.Roleid);

    this.BranchForm.patchValue({
      company_id : user?.company?.id,
      name: user?.userRoles[0]?.user?.name,
      email: user?.email,
      phone : user?.phone,
      location: user?.location,
      role_id: this.Roleid
    })
  }

  deleteUser(user:any){
    const id = user?.id || this.SelectedBranchId;
    this.alert.confirm("Are you sure you want to delete this branch?").then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`delete/${id}`).subscribe({
          next:(res: any)=> {
            this.alert.success("Branch deleted successfully");
            this.getBranches();
          }
        });
      }
    });
  }
  cancelBranch(){
    this.Branch_Forms = false;
    this.Update_button =false;
    this.BranchForm.reset();
    // this.getRoles();
  }
  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const payload = form.getRawValue();
    if(!this.Update_button){
    this.commonService.postApi(`branches`, payload).subscribe({
      next:(res:any)=> {
        
          this.alert.success("Branch Create Successfully")
          this.Branch_Forms = false;
          this.BranchForm.reset();
          this.cancelBranch();
          this.getBranches();
        
      },
      error: (err: any) => {
        console.log('Error:',err); 
      } 
      
    })
  }else if(this.Update_button){
    this.commonService.putApi(`branches/${this.SelectedBranchId}`,payload).subscribe({
      next:(res:any)=> {
        this.alert.success("Branch Create Successfully")
        this.Branch_Forms = false;
        this.BranchForm.reset();
        this.cancelBranch();
          this.getBranches();
      }
    })
  }
  }

}
