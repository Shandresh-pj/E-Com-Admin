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

declare var Razorpay: any;

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

    this.paymentForm.get('order_id')?.valueChanges.subscribe(orderId => {
      if (orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
          this.paymentForm.patchValue({
            amount: order.total,
            user_id: order.user_id
          }, { emitEvent: false });
        }
      }
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

    const payload = this.paymentForm.value;

    if (payload.method === 'RAZORPAY') {
      this.initiateRazorpayPayment(payload);
      return;
    }

    if (payload.method === 'STRIPE' || payload.method === 'PAYPAL') {
      this.alert.warning(`${payload.method} integration is coming in Phase 2`);
      return;
    }

    this.loading = true;
    this.commonService.postApi('payments/create', payload).subscribe({
      next: () => {
        this.alert.success("Payment recorded successfully");
        this.toggleForm();
        this.loadPayments();
      },
      error: (err: any) => {
        console.error('Payment creation failed:', err);
        this.alert.error("Failed to record payment: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  initiateRazorpayPayment(payload: any) {
    this.loading = true;

    // Call backend to create Razorpay Order
    this.commonService.postApi('payments/razorpay/create-order', {
      order_id: payload.order_id
    }).subscribe({
      next: (res: any) => {
        if (!res.success) {
          this.alert.error(res.message || "Failed to initiate Razorpay order");
          this.loading = false;
          return;
        }
        const user = this.employees.find(e => e.id === payload.user_id);
        const options = {
          key: res.razorpay_key_id,
          amount: res.amount * 100, // paise
          currency: res.currency || "INR",
          name: "Spike E-Commerce",
          description: `Order Payment for Invoice ID: ${payload.order_id}`,
          order_id: res.razorpay_order_id,
          handler: (response: any) => {
            this.verifyRazorpayPayment(response, payload);
          },
          prefill: {
            name: user ? user.name : "",
            email: user ? user.email : "",
            contact: user ? user.phone || user.mobilenumber || "" : ""
          },
          theme: {
            color: "#6366f1"
          },
          modal: {
            ondismiss: () => {
              this.loading = false;
              this.alert.error("Payment window closed by user");
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.open();
      },
      error: (err: any) => {
        console.error("Razorpay order creation request failed:", err);
        this.alert.error(err.error?.message || "Failed to initialize payment gateway");
        this.loading = false;
      }
    });
  }

  verifyRazorpayPayment(rzpResponse: any, originalPayload: any) {
    const verificationPayload = {
      order_id: originalPayload.order_id,
      user_id: originalPayload.user_id,
      razorpay_payment_id: rzpResponse.razorpay_payment_id,
      razorpay_order_id: rzpResponse.razorpay_order_id,
      razorpay_signature: rzpResponse.razorpay_signature
    };

    this.commonService.postApi('payments/razorpay/verify', verificationPayload).subscribe({
      next: (res: any) => {
        this.alert.success("Razorpay payment successfully verified and recorded");
        this.toggleForm();
        this.loadPayments();
      },
      error: (err: any) => {
        console.error("Payment verification failed:", err);
        this.alert.error(err.error?.message || "Payment signature verification failed");
        this.loading = false;
      }
    });
  }
}
