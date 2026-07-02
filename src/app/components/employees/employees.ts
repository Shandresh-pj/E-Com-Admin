import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { PHONE_PATTERN } from 'src/utils/app-validators';
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
    // {
    //   columnDef: 'userType',
    //   header: 'Status',
    // },
  ];

  employeeTypes = [
    { value: 'Branch_Manager', label: 'Branch Manager'  },
    { value: 'Shopkeeper',     label: 'Shopkeeper'      },
    { value: 'Delivery_Boy',   label: 'Delivery Boy'    },
  ];

  EmployeeForm: FormGroup;
  Roles:    any[] = [];
  Companies: any[] = [];
  Branch:   any[] = [];
  Employees: any[] = [];

  UpdateButton   = false;
  Employee_Forms = false;
  View_Mode      = false;
  SelectedEmployessId: any;
  SelectedEmployee: any = null;

  constructor(
    private fb: FormBuilder,
    private alert: AlertService,
    private commonService: CommonService,
    public perm: PermissionService
  ) {
    this.EmployeeForm = fb.group({
      name:         ['', [Validators.required, Validators.maxLength(100)]],
      email:        ['', [Validators.required, Validators.email]],
      mobilenumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      userType:     ['', Validators.required],
      company_id:   ['', Validators.required],
      branch_id:    ['', Validators.required],
      role_id:      ['', Validators.required],
    });
  }

  ngOnInit() {
    this.getRoles();
    this.getCompany();
    // this.getBranch();
    this.getEmployees();

    this.EmployeeForm.get('company_id')?.valueChanges.subscribe(
      (companyId) => {
        this.onCompanyChange(companyId);
      }
    );
  }

  AddNewUser() {
    this.Employee_Forms = true;
    this.View_Mode = false;
  }

  viewUser(user: any) {
    this.SelectedEmployee = user;
    this.View_Mode = true;
    this.Employee_Forms = false;
  }

  closeView() {
    this.View_Mode = false;
    this.SelectedEmployee = null;
  }

  editUser(user: any) {
    this.Employee_Forms      = true;
    this.UpdateButton        = true;
    this.SelectedEmployessId = user?.id;

    const userRole = user?.userRoles?.[0];

    this.EmployeeForm.patchValue({
      name:         user?.name,
      email:        user?.email,
      mobilenumber: user?.mobilenumber,
      userType:     user?.userType,
      company_id:   userRole?.company?.id  || null,
      branch_id:    userRole?.branch?.id   || null,
      role_id:      userRole?.role?.id     || null,
    });
  }

  deleteUser(user: any) {
    const id = user?.id || this.SelectedEmployessId;
    this.alert.confirm('Are you sure you want to delete this employee?').then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`employees/${id}`).subscribe({
          next: () => {
            this.alert.success('Employee deleted successfully');
            this.getEmployees();
          }
        });
      }
    });
  }

  cancelBranch(){
    this.Employee_Forms = false;
    this.UpdateButton =false;
    this.EmployeeForm.reset()
  }

  
  getRoles(){
    this.commonService.getApi(`roles`).subscribe({
      next:(res:any)=> {
        this.Roles = res?.data
        const defaultRole = this.Roles.find(
          (x:any)=>x.name==="Employee"
        );
        if(defaultRole){
          this.EmployeeForm.patchValue({
            role_id: defaultRole.id
          });
        }
      }
    })
  }

  getCompany() {
    this.commonService.getApi('companies').subscribe({
      next: (res: any) => {
        this.Companies = res?.data || [];
  
        this.Employees = this.Companies.flatMap(
          (company: any) =>
            company.userRoles
              ?.filter(
                (role: any) => role.role?.name === 'Employee'
              )
              .map((role: any) => ({
                id: role.user?.id,
                name: role.user?.name,
                email: role.user?.email,
                mobilenumber: role.user?.mobilenumber,
                companyId: company.id,
                companyName: company.name,
                branchId: role.branch?.id,
                branchName: role.branch?.name
              }))
        ) || [];
      }
    });
  }
  
  
  onCompanyChange(companyId: number) {
    const company = this.Companies.find(
      (x: any) => x.id === companyId
    );
  
    if (company) {
      // Get unique branches only
      this.Branch = company.userRoles
        ?.filter((role: any) => role.branch)
        .map((role: any) => ({
          id: role.branch.id,
          name: role.branch.name
        }))
        .filter(
          (branch: any, index: number, self: any[]) =>
            index === self.findIndex(
              (b: any) => b.id === branch.id
            )
        ) || [];
    }
  
    this.EmployeeForm.patchValue({
      branch_id: ''
    });
  }

  // getBranch(){
  //   this.commonService.getApi(`branches`).subscribe({
  //     next:(res:any) => {
  //       this.Branch = res?.data
  //     }
  //   })
  // }
  getEmployees(){
    this.commonService.getApi(`employees`).subscribe({
      next:(res:any) => {
        this.Employees = res?.data
      }
    })
  }

  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const payload = form.getRawValue();

    if (!this.UpdateButton) {
      this.commonService.postApi('employees', payload).subscribe({
        next: () => {
          this.alert.success('Employee created successfully');
          this.getEmployees();
          this.cancelBranch();
        }
      });
    } else {
      this.commonService.putApi(`employees/${this.SelectedEmployessId}`, payload).subscribe({
        next: () => {
          this.alert.success('Employee updated successfully');
          this.getEmployees();
          this.cancelBranch();
        }
      });
    }
  }
}
