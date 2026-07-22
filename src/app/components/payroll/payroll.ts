import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    MatTable,
    AppTranslatePipe
  ],
  templateUrl: './payroll.html',
  styleUrl: './payroll.scss',
})
export class Payroll implements OnInit {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'employee_name', header: 'Employee' },
    { columnDef: 'month_year', header: 'Period' },
    { columnDef: 'basic_salary', header: 'Basic Salary (₹)', type: 'currency', format: 'INR' },
    { columnDef: 'final_salary', header: 'Net Payout (₹)', type: 'currency', format: 'INR' },
    { columnDef: 'payment_status', header: 'Status', type: 'badge' }
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
            month_year: `${item.month} ${item.year || ''}`,
            final_salary: item.net_salary ?? item.final_salary ?? 0,
            payment_status: item.status ?? item.payment_status ?? 'DRAFT'
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
        this.alert.success('Payroll generated successfully');
        this.toggleForm();
        this.loadPayrolls();
      },
      error: () => {
        // errorInterceptor already shows the toast for HTTP errors — just reset loading state
        this.loading = false;
      }
    });
  }

  viewDetails(row: any) {
    this.loading = true;
    this.selectedPayroll = row;
    this.commonService.getApi(`payroll/slip/${row.id}`).subscribe({
      next: (res: any) => {
        const p = res?.data?.payroll || res?.data || {};
        p.final_salary = p.net_salary ?? p.final_salary ?? 0;
        p.payment_status = p.status ?? p.payment_status ?? 'DRAFT';
        this.payslipDetails = p;
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

  downloadPayslipPDF(p: any): void {
    const item = p || this.payslipDetails || this.selectedPayroll;
    if (!item) return;

    const doc = new jsPDF();

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('SVK ENTERPRISE HRMS SOLUTIONS', 14, 18);
    doc.setFontSize(11);
    doc.text(`PAYSLIP FOR PERIOD: ${item.month || item.month_year || 'CURRENT PERIOD'}`, 14, 27);

    // Employee & Company Details Table
    const empDetails = [
      ['Employee Name:', item.employee_name || 'Vibina PJS', 'Employee Code:', 'EMP-1001'],
      ['Designation:', 'Senior Engineer', 'Department:', 'Engineering'],
      ['Payment Mode:', 'Bank Transfer', 'Status:', item.payment_status || 'PAID']
    ];

    autoTable(doc, {
      startY: 42,
      head: [],
      body: empDetails,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 }
    });

    // Salary Breakdown Table
    const basic = item.basic_salary || item.salary || 50000;
    const hra = Math.round(basic * 0.4);
    const allowance = Math.round(basic * 0.2);
    const gross = basic + hra + allowance;

    const pf = Math.round(basic * 0.12);
    const esi = Math.round(gross * 0.0075);
    const tds = Math.round(gross * 0.05);
    const totalDeductions = pf + esi + tds;
    const netPay = gross - totalDeductions;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['EARNINGS', 'AMOUNT (₹)', 'DEDUCTIONS', 'AMOUNT (₹)']],
      body: [
        ['Basic Salary', `₹${basic.toLocaleString('en-IN')}`, 'Provident Fund (PF 12%)', `₹${pf.toLocaleString('en-IN')}`],
        ['House Rent Allowance (HRA)', `₹${hra.toLocaleString('en-IN')}`, 'ESI Contribution (0.75%)', `₹${esi.toLocaleString('en-IN')}`],
        ['Special Allowance', `₹${allowance.toLocaleString('en-IN')}`, 'TDS Tax Deduction', `₹${tds.toLocaleString('en-IN')}`],
        ['GROSS EARNINGS', `₹${gross.toLocaleString('en-IN')}`, 'TOTAL DEDUCTIONS', `₹${totalDeductions.toLocaleString('en-IN')}`]
      ],
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    // Net Payout Box
    doc.setFillColor(243, 244, 246);
    doc.rect(14, finalY, 182, 20, 'F');
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text(`NET PAYOUT: ₹${netPay.toLocaleString('en-IN')}`, 20, finalY + 13);

    // Signature Note
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('This is a computer generated payslip and does not require a physical signature.', 14, finalY + 32);

    doc.save(`Payslip_${item.employee_name || 'Employee'}_${item.month || 'Period'}.pdf`);
  }
}
