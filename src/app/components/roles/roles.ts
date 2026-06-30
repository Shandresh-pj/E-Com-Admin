import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  selector: 'app-roles',
  imports: [ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatTable],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles {

  RolesForm:FormGroup;
  Roles: any;

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

  constructor( private fb:FormBuilder,
    private commonService:CommonService,
    private auth:AuthService,
    private alert:AlertService
  ){
    this.RolesForm = fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      isActive: [true, Validators.required]
    })
    this.getRoles();
  }
  getRoles(){
    this.commonService.getApi(`roles`).subscribe({
      next:(res:any) => {
        this.Roles = res?.data
      }
    })
  }

  cancelRoles(){
    this.RolesForm.reset();

  }

  onsubmit(Form: FormGroup) {
    if (Form.invalid) {
      Form.markAllAsTouched();
      return;
    }
    const payload = this.RolesForm.getRawValue();
    this.commonService.postApi(`roles`,payload).subscribe({
      next:(res:any) => {
        this.alert.success('Roles Create Successfully')
      }
    })
  }
}
