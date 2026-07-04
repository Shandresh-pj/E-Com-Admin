import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';

@Component({
  selector: 'app-payments',
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
    MatTableModule
  ],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class Payments implements OnInit {
  payments: any[] = [];
  orders: any[] = [];
  employees: any[] = [];

  paymentForm: FormGroup;
  showForm = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.paymentForm = this.fb.group({
      order_id: ['', Validators.required],
      user_id: ['', Validators.required],
      method: ['CASH', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      status: ['SUCCESS', Validators.required],
      transaction_id: [''],
      gateway: ['']
    });
  }

  ngOnInit() {
    this.loadPayments();
    this.loadLookups();
  }

  loadPayments() {
    this.loading = true;
    this.commonService.getApi('payments').subscribe({
      next: (res: any) => {
        const rawPayments = res?.data || [];
        this.payments = rawPayments.map((item: any) => {
          const emp = this.employees.find(e => e.id === item.user_id);
          const order = this.orders.find(o => o.id === item.order_id);
          return {
            ...item,
            user_name: emp ? emp.name : `User ID: ${item.user_id}`,
            invoice_no: order ? order.invoice_no : `Order #${item.order_id}`,
            created_at: item.created_at ? new Date(item.created_at).toLocaleString() : '-'
          };
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load payments history:', err);
        this.loading = false;
      }
    });
  }

  loadLookups() {
    this.commonService.getApi('orders').subscribe({
      next: (res: any) => { 
        this.orders = res?.data || [];
        this.updateMappingNames();
      }
    });

    this.commonService.getApi('employees').subscribe({
      next: (res: any) => { 
        this.employees = res?.data || [];
        this.updateMappingNames();
      }
    });
  }

  updateMappingNames() {
    if (this.payments.length > 0) {
      this.payments = this.payments.map(item => {
        const emp = this.employees.find(e => e.id === item.user_id);
        const order = this.orders.find(o => o.id === item.order_id);
        return {
          ...item,
          user_name: emp ? emp.name : item.user_name,
          invoice_no: order ? order.invoice_no : item.invoice_no
        };
      });
      this.cdr.detectChanges();
    }
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.paymentForm.reset({
        method: 'CASH',
        status: 'SUCCESS'
      });
    }
  }

  recordPayment() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.paymentForm.value;

    this.commonService.postApi('payments/create', payload).subscribe({
      next: () => {
        this.alert.success("Payment recorded successfully");
        this.toggleForm();
        this.loadPayments();
      },
      error: (err) => {
        console.error('Payment creation failed:', err);
        this.alert.error("Failed to record payment: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }
}
