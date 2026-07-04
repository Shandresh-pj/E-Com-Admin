import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTable
  ],
  templateUrl: './payroll.html',
  styleUrl: './payroll.scss',
})
export class Payroll implements OnInit {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'employee_name', header: 'Employee' },
    { columnDef: 'month_year', header: 'Period' },
    { columnDef: 'basic_salary', header: 'Basic Salary ($)' },
    { columnDef: 'final_salary', header: 'Final Salary ($)' },
    { columnDef: 'payment_status', header: 'Payment Status' }
  ];

  payrolls: any[] = [];
  employees: any[] = [];
  months = [
    { value: 'January', label: 'January' },
    { value: 'February', label: 'February' },
    { value: 'March', label: 'March' },
    { value: 'April', label: 'April' },
    { value: 'May', label: 'May' },
    { value: 'June', label: 'June' },
    { value: 'July', label: 'July' },
    { value: 'August', label: 'August' },
    { value: 'September', label: 'September' },
    { value: 'October', label: 'October' },
    { value: 'November', label: 'November' },
    { value: 'December', label: 'December' }
  ];

  payrollForm: FormGroup;
  showForm = false;
  viewDetailsMode = false;
  selectedPayroll: any = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService
  ) {
    this.payrollForm = this.fb.group({
      employee_id: ['', Validators.required],
      month: ['July', Validators.required],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020)]]
    });
  }

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.loading = true;
    this.commonService.getApi('employees').subscribe({
      next: (res: any) => {
        this.employees = res?.data || [];
        this.loadPayrolls();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadPayrolls() {
    this.commonService.getApi('payroll').subscribe({
      next: (res: any) => {
        this.payrolls = (res?.data || []).map((item: any) => {
          const emp = this.employees.find(e => e.id === item.employee_id);
          return {
            ...item,
            employee_name: emp ? emp.name : `Employee ID: ${item.employee_id}`,
            month_year: `${item.month} ${item.year || ''}`
          };
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load payroll records:', err);
        this.loading = false;
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    this.viewDetailsMode = false;
    if (!this.showForm) {
      this.payrollForm.reset({ month: 'July', year: new Date().getFullYear() });
    }
  }

  generatePayroll() {
    if (this.payrollForm.invalid) {
      this.payrollForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.payrollForm.value;

    this.commonService.postApi('payroll/generate', payload).subscribe({
      next: () => {
        this.alert.success("Payroll generated successfully");
        this.toggleForm();
        this.loadPayrolls();
      },
      error: (err) => {
        console.error('Payroll generation failed:', err);
        this.alert.error("Payroll generation failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  viewDetails(row: any) {
    this.selectedPayroll = row;
    this.viewDetailsMode = true;
    this.showForm = false;
  }

  closeDetails() {
    this.viewDetailsMode = false;
    this.selectedPayroll = null;
  }
}
