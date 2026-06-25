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
      columnDef: 'isActive',
      header: 'Status',
    },
  ];

  BranchForm : FormGroup;
  Branch_Forms : boolean = false;
  Update_button : boolean = false;
  Branch: any;
  Companies: any;
  SelectedBranchId: any;
  constructor(
    private fb:FormBuilder,
    private authService:AuthService,
    private commonService:CommonService,
    private alert:AlertService
  ){
    this.BranchForm = fb.group({
      company_id : ['',Validators.required],
      name : ['',Validators.required],
      email : ['',[Validators.required, Validators.email]],
      phone : ['', Validators.required],
      location : [''],
      role_id:[4]
    })
  }

  ngOnInit(){
    this.getBranches();
    this.getCompanies();
  }

  getBranches(){
    this.commonService.getApi(`branches`).subscribe({
      next:(res:any)=> {
        this.Branch = res?.data
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
    this.Branch_Forms =true
  }
  editUser(user:any){
    console.log(user);
    this.SelectedBranchId = user?.id
    this.Branch_Forms =true
    this.Update_button =true
    this.BranchForm.patchValue({
      company_id : user?.company_id,
      name: user?.name,
      email: user?.email,
      phone : user?.phone,
      location: user?.location
    })
  }

  deleteUser(user:any){
    this.commonService.deleteApi(`delete/${this.SelectedBranchId}`).subscribe({
      next:(res: any)=> {
        this.alert.confirm("Delete the Branch");
        this.getBranches();

      }
    })
  }
  cancelBranch(){
    this.Branch_Forms = false;
    this.Update_button =false;
    this.BranchForm.reset()
  }
  submit(form: FormGroup){
    const payload = form.value;
    console.log('Resss',payload)
    if(!this.Update_button){
    this.commonService.postApi(`branches`, payload).subscribe({
      next:(res:any)=> {
        
          this.alert.success("Branch Create Successfully")
          this.Branch_Forms = false;
          this.BranchForm.reset();
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
          this.getBranches();
      }
    })
  }
  }

}
