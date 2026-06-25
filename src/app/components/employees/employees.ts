import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-employees',
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
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
})
export class Employees {
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
      columnDef: 'mobilenumber',
      header: 'Mobile Number'
    },
    {
      columnDef: 'userType',
      header: 'Status',
    },
  ];

  EmployeeForm:FormGroup;
  Roles: any;
  Companies: any;
  Branch: any;
  UpdateButton : boolean = false;
  Employee_Forms : boolean = false;
  SelectedEmployessId: any;
  Employees: any;
  
  constructor(
    private fb:FormBuilder,
    private alert:AlertService,
    private commonService:CommonService
  ){
    this.EmployeeForm = fb.group({
      name : ['', Validators.required],
      email: ['',[Validators.required,Validators.email]],
      mobilenumber:['',Validators.required],
      company_id:['',Validators.required],
      branch_id:['',Validators.required],
      role_id:[{value:5, disabled: true},Validators.required]
    })
  }

  ngOnInit(){
    this.getRoles();
    this.getCompany();
    this.getBranch();
    this.getEmployees();
  }
  AddNewUser(){
    this.Employee_Forms =true
  }
  editUser(user:any){

    console.log(user);
  
    this.Employee_Forms = true;
    this.UpdateButton = true;
    this.SelectedEmployessId = user?.id;
  
    const userRole = user?.userRoles?.[0];
  
    this.EmployeeForm.patchValue({
  
      name: user?.name,
      email: user?.email,
      mobilenumber: user?.mobilenumber,
  
      company_id:
        userRole?.company?.id || null,
  
      branch_id:
        userRole?.branch?.id || null,
  
      role_id:
        userRole?.role?.id || null
  
    });
  
  }

  
  deleteUser(user:any){
    this.commonService.deleteApi(`delete/${this.SelectedEmployessId}`).subscribe({
      next:(res: any)=> {
        this.alert.confirm("Delete the Branch");
        this.getEmployees();

      }
    })
  }
  cancelBranch(){
    this.Employee_Forms = false;
    this.UpdateButton =false;
    this.EmployeeForm.reset()
  }
  getRoles(){
    this.commonService.getApi(`roles`).subscribe({
      next:(res:any) => {
        this.Roles = res?.data
      }
    })
  }

  getCompany(){
    this.commonService.getApi(`companies`).subscribe({
      next:(res:any) => {
        this.Companies = res?.data
      }
    })
  }

  getBranch(){
    this.commonService.getApi(`branches`).subscribe({
      next:(res:any) => {
        this.Branch = res?.data
      }
    })
  }
  getEmployees(){
    this.commonService.getApi(`employees`).subscribe({
      next:(res:any) => {
        this.Employees = res?.data
      }
    })
  }

  submit(form:FormGroup){
    const payload = form?.value
    console.log("payload",payload);
    if(!this.UpdateButton){
    this.commonService.postApi(`employees`,payload).subscribe({
      next:(res:any)=>{ 
        this.alert.success("Employees Create Successfully")
        this.getEmployees();
        this.EmployeeForm.reset()
        this.Employee_Forms = false;
        this.UpdateButton =false;
      }
    })
  }else {
    this.commonService.putApi(`employees/${this.SelectedEmployessId}`,payload).subscribe({
      next: (res:any) => {
        this.alert.success("Employees Details Updated Successfully")
        this.getEmployees();
        this.EmployeeForm.reset()
        this.Employee_Forms = false;
        this.UpdateButton =false;
      }
    })
  }
  }
}
