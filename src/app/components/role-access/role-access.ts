import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-role-access',
  imports: [ ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatTable],
  templateUrl: './role-access.html',
  styleUrl: './role-access.scss',
})
export class RoleAccess {

  RoleAccessForm : FormGroup;

  tableColumns = [
    {
      columnDef: 'id',
      header: 'No'
    },
    {
      columnDef: 'name',
      header: 'Roles Name'
    },
  ]
  Roles: any;
  Menus: any;
  UpdateButton: boolean = false;
  AddNewRoleAccess: boolean =false;
  Companies: any;
  Branches: any;
  Employees: any;

  constructor(private fb:FormBuilder,
    private alert:AlertService,
    private commonService:CommonService
  ){
    this.RoleAccessForm = this.fb.group({
      role_id : ['',Validators.required],
      permission_id: ['', Validators.required]
    })

  }

  ngOnInit(){
    this.getCompanies()
    this.getBranches()
    this.getEmployees()
    this.getRoles();
    this.getMenus();
  }

  getCompanies(){
    this.commonService.getApi(`companies`).subscribe({
      next:(res:any)=>{
        this.Companies = res?.data
      }
    })
  }
  
  getBranches(){
    this.commonService.getApi(`branches`).subscribe({
      next:(res:any)=>{
        this.Branches = res?.data
      }
    })
  }

  getEmployees(){
    this.commonService.getApi(`employees`).subscribe({
      next:(res:any)=>{
        this.Employees = res?.data
      }
    })
  }

  getRoles(){
    this.commonService.getApi(`roles`).subscribe({
      next:(res:any)=> {
        this.Roles = res?.data
      }
    })
  }

  getMenus(){
    this.commonService.getApi(`menus`).subscribe({
      next:(res:any)=>{
        this.Menus = res?.data
      }
    })
  }

  AddNewUser(){
    this.AddNewRoleAccess = true
  }

  cancelRoleAccess(){
    this.RoleAccessForm.reset();
    this.AddNewRoleAccess = false;
  }

  onsubmit(form:FormGroup){
    const payload = form.getRawValue();
    this.commonService.postApi(`role-access`,payload).subscribe({
      next:(res:any)=>{
        this.alert.success("Role Access Assigned")
      }
    })
  }

}
