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
    MatTable
  ],
  templateUrl: './payroll.html',
  styleUrl: './payroll.scss',
})
export class Payroll implements OnInit {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'employee_name', header: 'Employee' },
    { columnDef: 'month_year', header: 'Payroll Period' },
    { columnDef: 'basic_salary', header: 'Basic Salary (₹)', type: 'currency', format: 'INR' },
    { columnDef: 'gross_salary', header: 'Gross Salary (₹)', type: 'currency', format: 'INR' },
    { columnDef: 'total_deductions', header: 'Deductions (₹)', type: 'currency', format: 'INR' },
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
  salaryAssignForm: FormGroup;

  showForm = false;
  showSalaryAssignModal = false;
  viewDetailsMode = false;
  showPaymentModal = false;
  selectedPayroll: any = null;
  selectedEmployeeForSalary: any = null;
  payslipDetails: any = null;
  loading = false;

  formatAmount(val: any): string {
    return Number(val || 0).toLocaleString('en-IN');
  }

  get totalGrossPayout(): number {
    return (this.payrolls || []).reduce((acc, p) => acc + (p.gross_salary || 0), 0);
  }

  get totalNetPayout(): number {
    return (this.payrolls || []).reduce((acc, p) => acc + (p.net_salary || p.final_salary || 0), 0);
  }

  get totalDeductionsSum(): number {
    return (this.payrolls || []).reduce((acc, p) => acc + (p.total_deductions || 0), 0);
  }

  get totalRecordsCount(): number {
    return (this.payrolls || []).length;
  }

  openSalaryAssignmentModal() {
    this.openSalaryAssignment();
  }

  toggleGenerateForm() {
    this.showForm = !this.showForm;
  }

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.payrollForm = this.fb.group({
      employee_id: [1, Validators.required],
      month: ['July', Validators.required],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020)]]
    });

    this.paymentForm = this.fb.group({
      payment_reference: ['', Validators.required],
      payment_method: ['BANK_TRANSFER', Validators.required]
    });

    this.salaryAssignForm = this.fb.group({
      employee_id: [1, Validators.required],
      basic_salary: [50000, [Validators.required, Validators.min(0)]],
      hra: [20000, Validators.min(0)],
      da: [4000, Validators.min(0)],
      allowances: [5000, Validators.min(0)],
      overtime_rate: [250, Validators.min(0)],
      pf: [6000, Validators.min(0)],
      esi: [540, Validators.min(0)],
      tds: [2000, Validators.min(0)],
      pt: [200, Validators.min(0)],
      loan_deduction: [0, Validators.min(0)],
      advance: [0, Validators.min(0)]
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
          const empId = Number(item.employee_id);
          const emp = this.employees.find(e => e.id === empId);
          return {
            ...item,
            employee_name: emp ? emp.name : `Employee ID: ${empId}`,
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

  openSalaryAssignment(emp?: any) {
    const targetEmp = emp || (this.employees.length > 0 ? this.employees[0] : null);
    if (!targetEmp) return;

    this.selectedEmployeeForSalary = targetEmp;
    this.salaryAssignForm.patchValue({
      employee_id: targetEmp.id,
      basic_salary: targetEmp.basic_salary || 50000,
      hra: targetEmp.hra || Math.round((targetEmp.basic_salary || 50000) * 0.4),
      da: targetEmp.da || 4000,
      allowances: targetEmp.allowances || 5000,
      overtime_rate: targetEmp.overtime_rate || 250,
      pf: targetEmp.pf || Math.round((targetEmp.basic_salary || 50000) * 0.12),
      esi: targetEmp.esi || 540,
      tds: targetEmp.tds || 2000,
      pt: targetEmp.pt || 200,
      loan_deduction: targetEmp.loan_deduction || 0,
      advance: targetEmp.advance || 0
    });

    this.showSalaryAssignModal = true;
  }

  saveSalaryAssignment() {
    if (this.salaryAssignForm.invalid) {
      this.salaryAssignForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.salaryAssignForm.value;
    const empId = Number(payload.employee_id);

    this.commonService.putApi(`employees/${empId}`, payload).subscribe({
      next: () => {
        this.alert.success("Employee Salary Structure updated successfully!");
        this.showSalaryAssignModal = false;
        this.loadEmployees();
      },
      error: (err) => {
        this.alert.error("Failed to update salary: " + (err.error?.message || "Error"));
        this.loading = false;
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    this.viewDetailsMode = false;
    if (!this.showForm) {
      this.payrollForm.reset({ employee_id: 1, month: 'July', year: new Date().getFullYear() });
    }
  }

  generatePayroll() {
    if (this.payrollForm.invalid) {
      this.payrollForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = {
      ...this.payrollForm.value,
      employee_id: Number(this.payrollForm.value.employee_id)
    };

    this.commonService.postApi('payroll/generate', payload).subscribe({
      next: () => {
        this.alert.success('Payroll generated with Attendance & Leave synchronization!');
        this.toggleForm();
        this.loadPayrolls();
      },
      error: (err) => {
        this.alert.error("Generation failed: " + (err.error?.message || "Error"));
        this.loading = false;
      }
    });
  }

  viewDetails(row: any) {
    this.loading = true;
    this.selectedPayroll = row;
    this.commonService.getApi(`payroll/slip/${row.id}`).subscribe({
      next: (res: any) => {
        const p = res?.data?.payroll || res?.data || row;
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
        this.alert.success('Payroll approved and locked for payout release');
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
    this.paymentForm.reset({ payment_method: 'BANK_TRANSFER', payment_reference: `TXN-${Date.now()}` });
  }

  submitPayment() {
    if (this.paymentForm.invalid || !this.selectedPayroll) return;
    const payload = this.paymentForm.value;
    
    this.loading = true;
    this.commonService.postApi(`payroll/mark-paid/${this.selectedPayroll.id}`, payload).subscribe({
      next: () => {
        this.alert.success('Payment released and salary slip marked as PAID');
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
    doc.text('SPIKE HRMS ENTERPRISE PAYSLIP', 14, 18);
    doc.setFontSize(11);
    doc.text(`PERIOD: ${item.month || 'JULY'} ${item.year || 2026}`, 14, 27);

    const emp = this.employees.find(e => e.id === Number(item.employee_id));
    const empName = emp ? emp.name : (item.employee_name || 'Employee');
    const empDesig = emp?.designation || (emp?.userType ? emp.userType.replace('_', ' ') : 'Associate');
    const empDept = emp?.department || 'Operations';
    const empCode = `EMP-${item.employee_id || (emp ? emp.id : 1001)}`;

    // Employee & Company Details Table
    const empDetails = [
      ['Employee Name:', empName, 'Employee Code:', empCode],
      ['Designation:', empDesig, 'Department:', empDept],
      ['Payment Mode:', item.payment_method || 'BANK_TRANSFER', 'Payment Status:', item.payment_status || 'PAID']
    ];

    autoTable(doc, {
      startY: 42,
      head: [],
      body: empDetails,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 }
    });

    const basic = item.basic_salary || 50000;
    const hra = item.hra || Math.round(basic * 0.4);
    const da = item.da || 4000;
    const allowances = item.allowances || 5000;
    const ot = item.overtime_amount || 0;
    const gross = item.gross_salary || (basic + hra + da + allowances + ot);

    const pf = item.pf_deduction || Math.round(basic * 0.12);
    const esi = item.esi_deduction || Math.round(gross * 0.0075);
    const tds = item.tds_deduction || Math.round(gross * 0.05);
    const pt = item.pt_deduction || 200;
    const totalDeductions = item.total_deductions || (pf + esi + tds + pt);
    const netPay = item.net_salary || (gross - totalDeductions);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['EARNINGS', 'AMOUNT (₹)', 'DEDUCTIONS', 'AMOUNT (₹)']],
      body: [
        ['Basic Salary', `₹${basic.toLocaleString('en-IN')}`, 'Provident Fund (PF 12%)', `₹${pf.toLocaleString('en-IN')}`],
        ['House Rent Allowance (HRA)', `₹${hra.toLocaleString('en-IN')}`, 'ESI Contribution (0.75%)', `₹${esi.toLocaleString('en-IN')}`],
        ['Dearness Allowance (DA)', `₹${da.toLocaleString('en-IN')}`, 'TDS Tax Deduction', `₹${tds.toLocaleString('en-IN')}`],
        ['Special Allowances', `₹${allowances.toLocaleString('en-IN')}`, 'Professional Tax (PT)', `₹${pt.toLocaleString('en-IN')}`],
        ['Overtime Earnings', `₹${ot.toLocaleString('en-IN')}`, 'Loss of Pay / Loan', `₹${(item.lop_deduction || 0) + (item.loan_deduction || 0)}`],
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

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('This is a system-generated electronic payslip verified by Spike HRMS Engine.', 14, finalY + 32);

    doc.save(`Payslip_${item.employee_name || 'Employee'}_${item.month || 'July'}.pdf`);
  }

  handlePayrollAction(row: any) {
    if (row.status === 'DRAFT' || row.payment_status === 'DRAFT') {
      this.approvePayroll(row.id);
    } else if (row.status === 'APPROVED' || row.payment_status === 'APPROVED') {
      this.initiatePayment(row);
    } else {
      this.downloadPayslipPDF(row);
    }
  }
}
