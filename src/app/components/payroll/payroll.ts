import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
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
    MaterialModule,
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
    { columnDef: 'basic_salary', header: 'Basic Salary (₹)' },
    { columnDef: 'final_salary', header: 'Net Payout (₹)' },
    { columnDef: 'payment_status', header: 'Status' }
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
  paymentForm: FormGroup;
  showForm = false;
  viewDetailsMode = false;
  showPaymentModal = false;
  selectedPayroll: any = null;
  payslipDetails: any = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.payrollForm = this.fb.group({
      employee_id: ['', Validators.required],
      month: ['July', Validators.required],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020)]]
    });

    this.paymentForm = this.fb.group({
      payment_reference: ['', Validators.required],
      payment_method: ['BANK_TRANSFER', Validators.required]
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
        this.cdr.detectChanges();
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
    this.loading = true;
    this.selectedPayroll = row;
    this.commonService.getApi(`payroll/slip/${row.id}`).subscribe({
      next: (res: any) => {
        this.payslipDetails = res?.data || null;
        this.viewDetailsMode = true;
        this.showForm = false;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load payslip:', err);
        this.alert.error('Failed to fetch detailed payslip data');
        this.loading = false;
      }
    });
  }

  closeDetails() {
    this.viewDetailsMode = false;
    this.selectedPayroll = null;
    this.payslipDetails = null;
  }

  approvePayroll(id: number) {
    this.loading = true;
    this.commonService.postApi(`payroll/approve/${id}`, {}).subscribe({
      next: () => {
        this.alert.success('Payroll approved and locked');
        this.loadPayrolls();
        if (this.selectedPayroll && this.selectedPayroll.id === id) {
          this.viewDetails(this.selectedPayroll);
        }
      },
      error: (err) => {
        this.alert.error(err.error?.message || 'Approval failed');
        this.loading = false;
      }
    });
  }

  initiatePayment(row: any) {
    this.selectedPayroll = row;
    this.showPaymentModal = true;
    this.paymentForm.reset({ payment_method: 'BANK_TRANSFER' });
  }

  submitPayment() {
    if (this.paymentForm.invalid || !this.selectedPayroll) return;
    const payload = this.paymentForm.value;
    
    this.loading = true;
    this.commonService.postApi(`payroll/mark-paid/${this.selectedPayroll.id}`, payload).subscribe({
      next: () => {
        this.alert.success('Payment recorded and payroll closed');
        this.showPaymentModal = false;
        this.loadPayrolls();
        this.closeDetails();
      },
      error: (err) => {
        this.alert.error(err.error?.message || 'Payment update failed');
        this.loading = false;
      }
    });
  }
}
