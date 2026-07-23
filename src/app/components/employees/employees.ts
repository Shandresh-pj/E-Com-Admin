import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { PHONE_PATTERN } from 'src/utils/app-validators';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatIconModule,
    MatTable,
    AppTranslatePipe
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
})
export class Employees implements OnInit {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'name', header: 'Employee Name' },
    { columnDef: 'email', header: 'Email' },
    { columnDef: 'department', header: 'Department' },
    { columnDef: 'designation', header: 'Designation' },
    { columnDef: 'status', header: 'Status', type: 'badge' }
  ];

  employeeTypes = [
    { value: 'Employee',       label: 'Standard Employee' },
    { value: 'Branch_Manager', label: 'Branch Manager'  },
    { value: 'Shopkeeper',     label: 'Shopkeeper'      },
    { value: 'Delivery_Boy',   label: 'Delivery Boy'    },
  ];

  EmployeeForm: FormGroup;
  Roles:     any[] = [];
  Companies: any[] = [];
  Branch:    any[] = [];
  Employees: any[] = [];

  UpdateButton   = false;
  Employee_Forms = false;
  View_Mode      = false;
  loading        = false;
  SelectedEmployessId: any;
  SelectedEmployee: any = null;

  constructor(
    private fb: FormBuilder,
    private alert: AlertService,
    private commonService: CommonService,
    private cdr: ChangeDetectorRef,
    public perm: PermissionService
  ) {
    this.EmployeeForm = fb.group({
      name:         ['', [Validators.required, Validators.maxLength(100)]],
      email:        ['', [Validators.required, Validators.email]],
      mobilenumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      userType:     ['Employee', Validators.required],
      company_id:   ['', Validators.required],
      branch_id:    ['', Validators.required],
      role_id:      ['', Validators.required],
      department:   ['General'],
      designation:  ['Staff'],
      salary:       [50000]
    });
  }

  ngOnInit() {
    this.getRoles();
    this.getCompany();
    this.getEmployees();

    this.EmployeeForm.get('company_id')?.valueChanges.subscribe(
      (companyId) => {
        if (companyId) {
          this.fetchBranchesForCompany(companyId);
        }
      }
    );
  }

  AddNewUser() {
    this.Employee_Forms = true;
    this.View_Mode = false;
    this.UpdateButton = false;
    this.SelectedEmployessId = null;
    this.EmployeeForm.reset({
      userType: 'Employee',
      department: 'General',
      designation: 'Staff',
      salary: 50000
    });

    if (this.Companies.length > 0) {
      const firstComp = this.Companies[0].id;
      this.EmployeeForm.patchValue({ company_id: firstComp });
      this.fetchBranchesForCompany(firstComp);
    }
  }

  viewUser(user: any) {
    this.SelectedEmployee = user;
    this.View_Mode = true;
    this.Employee_Forms = false;
    this.cdr.detectChanges();
  }

  closeView() {
    this.View_Mode = false;
    this.SelectedEmployee = null;
    this.cdr.detectChanges();
  }

  editUser(user: any) {
    this.Employee_Forms      = true;
    this.View_Mode           = false;
    this.UpdateButton        = true;
    this.SelectedEmployessId = user?.id;

    const userRole = user?.userRoles?.[0];
    const compId = userRole?.company?.id || userRole?.company_id || user?.company_id || (this.Companies[0]?.id || 1);
    const branchId = userRole?.branch?.id || userRole?.branch_id || user?.branch_id || null;
    const roleId = userRole?.role?.id || userRole?.role_id || user?.role_id || (this.Roles[0]?.id || 1);

    this.fetchBranchesForCompany(compId);

    this.EmployeeForm.patchValue({
      name:         user?.name,
      email:        user?.email,
      mobilenumber: user?.mobilenumber,
      userType:     user?.userType || 'Employee',
      company_id:   compId,
      branch_id:    branchId,
      role_id:      roleId,
      department:   user?.department || 'General',
      designation:  user?.designation || 'Staff',
      salary:       user?.salary || 50000
    });

    this.cdr.detectChanges();
  }

  deleteUser(user: any) {
    const id = user?.id || this.SelectedEmployessId;
    if (!id) return;

    this.alert.confirm('Are you sure you want to delete this employee?').then((result: any) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`employees/${id}`).subscribe({
          next: () => {
            this.alert.success('Employee deleted successfully');
            this.getEmployees();
          },
          error: (err: any) => {
            console.error('Failed to delete employee:', err);
            this.alert.error('Failed to delete employee: ' + (err.error?.message || 'Internal Error'));
          }
        });
      }
    });
  }

  cancelBranch() {
    this.Employee_Forms = false;
    this.UpdateButton = false;
    this.EmployeeForm.reset({
      userType: 'Employee',
      department: 'General',
      designation: 'Staff',
      salary: 50000
    });
    this.cdr.detectChanges();
  }

  getRoles() {
    this.commonService.getApi(`roles`).subscribe({
      next: (res: any) => {
        this.Roles = res?.data || [];
        const defaultRole = this.Roles.find((x: any) => x.name === 'Employee' || x.name === 'Staff');
        if (defaultRole && !this.EmployeeForm.value.role_id) {
          this.EmployeeForm.patchValue({ role_id: defaultRole.id });
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Failed to load roles:', err)
    });
  }

  getCompany() {
    this.commonService.getApi('companies').subscribe({
      next: (res: any) => {
        this.Companies = res?.data || [];
        if (this.Companies.length > 0 && !this.EmployeeForm.value.company_id) {
          const firstComp = this.Companies[0].id;
          this.EmployeeForm.patchValue({ company_id: firstComp });
          this.fetchBranchesForCompany(firstComp);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Failed to load companies:', err)
    });
  }

  fetchBranchesForCompany(companyId: number) {
    if (!companyId) {
      this.Branch = [];
      return;
    }
    this.commonService.getApi('branches').subscribe({
      next: (res: any) => {
        const allBranches = res?.data || [];
        this.Branch = allBranches.filter((b: any) =>
          Number(b.company_id || b.company?.id) === Number(companyId)
        );
        if (this.Branch.length > 0 && !this.EmployeeForm.value.branch_id) {
          this.EmployeeForm.patchValue({ branch_id: this.Branch[0].id });
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Failed to load branches:', err)
    });
  }

  onCompanyChange(companyId: number) {
    this.fetchBranchesForCompany(companyId);
  }

  getEmployees() {
    this.loading = true;
    this.commonService.getApi(`employees`).subscribe({
      next: (res: any) => {
        this.Employees = (res?.data || []).map((emp: any) => ({
          ...emp,
          department: emp.department || 'General',
          designation: emp.designation || 'Staff',
          status: emp.status || 'ACTIVE'
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load employees:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      this.alert.warning('Please fill in all required employee fields.');
      return;
    }

    this.loading = true;
    const payload = form.getRawValue();

    if (!this.UpdateButton) {
      this.commonService.postApi('employees', payload).subscribe({
        next: () => {
          this.alert.success('Employee created successfully! Credentials emailed to employee.');
          this.getEmployees();
          this.cancelBranch();
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Failed to create employee:', err);
          this.alert.error('Failed to create employee: ' + (err.error?.message || 'Internal Error'));
          this.loading = false;
        }
      });
    } else {
      this.commonService.putApi(`employees/${this.SelectedEmployessId}`, payload).subscribe({
        next: () => {
          this.alert.success('Employee profile updated successfully!');
          this.getEmployees();
          this.cancelBranch();
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Failed to update employee:', err);
          this.alert.error('Failed to update employee: ' + (err.error?.message || 'Internal Error'));
          this.loading = false;
        }
      });
    }
  }
}
