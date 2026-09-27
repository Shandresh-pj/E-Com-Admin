/**
 * payments.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY-HARDENED Razorpay Payment Component
 *
 * Frontend security measures:
 *  1. Razorpay script loaded from official CDN only (hardcoded, no user input)
 *  2. Script integrity verified: only executes if window.Razorpay is a Function
 *     (guards against script injection replacing the global with a malicious obj)
 *  3. HTTPS enforcement: payments refused if page is served over plain HTTP
 *  4. Razorpay window object validated before .open() call
 *  5. Timeout guard: if handler is never called within 10 min, loading resets
 *  6. razorpay_payment_id / razorpay_order_id / signature format validated
 *     before sending to backend (catches obvious tampering early)
 *  7. Amount shown to user is always from server response (not client form)
 *  8. Sensitive data (signature) never logged to console
 *  9. Dismiss / close handled gracefully to prevent UI deadlock
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';

// Razorpay global declaration — required only for TypeScript compiler
declare var Razorpay: any;

/** Validate Razorpay payment_id format (pay_xxxxx) */
function isValidPaymentId(id: string): boolean {
  return /^pay_[A-Za-z0-9]{14,}$/.test(id);
}

/** Validate Razorpay order_id format (order_xxxxx) */
function isValidOrderId(id: string): boolean {
  return /^order_[A-Za-z0-9]{14,}$/.test(id);
}

/** Validate HMAC-SHA256 hex signature (64 hex chars) */
function isValidSignature(sig: string): boolean {
  return /^[A-Fa-f0-9]{64}$/.test(sig);
}

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
    MatTable
  ],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class Payments implements OnInit {
  payments: any[] = [];
  orders: any[] = [];
  employees: any[] = [];

  /** Payment gateway timeout in ms — auto-reset loading if handler never fires */
  private readonly PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private paymentTimeoutRef: any = null;

  tableColumns: TableColumn[] = [
    { columnDef: 'invoice_no', header: 'Invoice / Order' },
    { columnDef: 'user_name', header: 'Payer' },
    { columnDef: 'amount', header: 'Amount', type: 'currency', format: 'USD' },
    { columnDef: 'method', header: 'Method', type: 'custom' },
    { columnDef: 'details', header: 'Txn ID / Gateway', type: 'custom' },
    { columnDef: 'created_at', header: 'Paid At' },
    { columnDef: 'status', header: 'Status', type: 'badge' }
  ];

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

  ngOnDestroy() {
    this.clearPaymentTimeout();
  }

  // ── Payment timeout guard ──────────────────────────────────────────────────
  private startPaymentTimeout() {
    this.clearPaymentTimeout();
    this.paymentTimeoutRef = setTimeout(() => {
      if (this.loading) {
        console.warn('[Payment] Timeout: gateway callback never received within limit');
        this.loading = false;
        this.alert.error('Payment session timed out. Please try again.');
        this.cdr.detectChanges();
      }
    }, this.PAYMENT_TIMEOUT_MS);
  }

  private clearPaymentTimeout() {
    if (this.paymentTimeoutRef) {
      clearTimeout(this.paymentTimeoutRef);
      this.paymentTimeoutRef = null;
    }
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
        this.alert.success('Payment recorded successfully');
        this.toggleForm();
        this.loadPayments();
      },
      error: (err: any) => {
        console.error('Payment creation failed:', err);
        this.alert.error('Failed to record payment: ' + (err.error?.message || 'Internal error'));
        this.loading = false;
      }
    });
  }

  // ── Razorpay Script Loader (security-hardened) ─────────────────────────────
  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // ── HTTPS enforcement ──────────────────────────────────────────────────
      // Razorpay payments MUST run over HTTPS in production. Reject if HTTP.
      if (window.location.protocol !== 'https:' &&
          !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        reject('Payments require a secure (HTTPS) connection. Please contact your administrator.');
        return;
      }

      if ((window as any).Razorpay && typeof (window as any).Razorpay === 'function') {
        resolve();
        return;
      }

      // Remove any existing (potentially poisoned) Razorpay script tag
      const existing = document.querySelector('script[data-rzp-script]');
      if (existing) existing.remove();

      const script = document.createElement('script');
      // Hardcoded official CDN URL — never user-configurable
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.setAttribute('data-rzp-script', '1');
      // crossorigin="anonymous" enables CORS for subresource integrity
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        // Verify the loaded script actually exported a callable Razorpay constructor
        if (typeof (window as any).Razorpay !== 'function') {
          reject('Razorpay script loaded but the global Razorpay object is not valid. Possible injection attack.');
          return;
        }
        resolve();
      };
      script.onerror = () => reject('Failed to load Razorpay checkout script. Check your internet connection.');
      document.body.appendChild(script);
    });
  }

  // ── Initiate Razorpay payment (security-hardened) ─────────────────────────
  async initiateRazorpayPayment(payload: any) {
    this.loading = true;

    try {
      await this.loadRazorpayScript();
    } catch (e: any) {
      this.alert.error(typeof e === 'string' ? e : 'Could not load payment gateway. Please check your internet connection.');
      this.loading = false;
      return;
    }

    this.commonService.postApi('payments/razorpay/create-order', {
      order_id: payload.order_id
    }).subscribe({
      next: (res: any) => {
        if (!res.success) {
          this.alert.error(res.message || 'Failed to initiate Razorpay order');
          this.loading = false;
          return;
        }

        // Use server-side amount — never trust client form value for payment amount
        const serverAmount = Number(res.amount);
        if (isNaN(serverAmount) || serverAmount <= 0) {
          this.alert.error('Invalid payment amount received from server.');
          this.loading = false;
          return;
        }

        const user = this.employees.find(e => e.id === payload.user_id);
        const options = {
          key: res.razorpay_key_id,
          amount: Math.round(serverAmount * 100), // convert to paise (server value)
          currency: res.currency || 'INR',
          name: 'Spike E-Commerce',
          description: `Order Payment — Invoice ID: ${payload.order_id}`,
          order_id: res.razorpay_order_id,
          handler: (response: any) => {
            this.clearPaymentTimeout();
            this.verifyRazorpayPayment(response, payload);
          },
          prefill: {
            name: user ? user.name : '',
            email: user ? user.email : '',
            contact: user ? user.phone || user.mobilenumber || '' : ''
          },
          theme: {
            color: '#6366f1'
          },
          modal: {
            ondismiss: () => {
              this.clearPaymentTimeout();
              this.loading = false;
              this.alert.warning('Payment window closed. No charge was made.');
              this.cdr.detectChanges();
            },
            escape: true,
            animation: true
          }
        };

        // Final guard: ensure Razorpay is still a valid constructor
        if (typeof Razorpay !== 'function') {
          this.alert.error('Payment gateway integrity check failed. Please refresh the page.');
          this.loading = false;
          return;
        }

        const rzp = new Razorpay(options);

        // Handle payment failures from the Razorpay modal
        rzp.on('payment.failed', (failureResponse: any) => {
          this.clearPaymentTimeout();
          console.error('[Payment] Failed:', failureResponse.error?.description);
          this.alert.error(`Payment failed: ${failureResponse.error?.description || 'Unknown error'}. No charge was made.`);
          this.loading = false;
          this.cdr.detectChanges();
        });

        // Start timeout watchdog after opening the modal
        this.startPaymentTimeout();
        rzp.open();
      },
      error: (err: any) => {
        this.clearPaymentTimeout();
        console.error('Razorpay order creation request failed:', err);
        this.alert.error(err.error?.message || 'Failed to initialize payment gateway');
        this.loading = false;
      }
    });
  }

  // ── Verify payment (with client-side format validation) ───────────────────
  verifyRazorpayPayment(rzpResponse: any, originalPayload: any) {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = rzpResponse;

    // ── Client-side format validation before hitting the backend ─────────────
    if (!isValidPaymentId(razorpay_payment_id)) {
      this.alert.error('Invalid payment ID received from gateway. Verification aborted.');
      this.loading = false;
      return;
    }
    if (!isValidOrderId(razorpay_order_id)) {
      this.alert.error('Invalid order ID received from gateway. Verification aborted.');
      this.loading = false;
      return;
    }
    if (!isValidSignature(razorpay_signature)) {
      this.alert.error('Malformed payment signature. Verification aborted.');
      this.loading = false;
      return;
    }

    const verificationPayload = {
      order_id: originalPayload.order_id,
      user_id: originalPayload.user_id,
      razorpay_payment_id,
      razorpay_order_id,
      // Note: signature is sent for server-side HMAC verification only
      razorpay_signature
    };

    this.commonService.postApi('payments/razorpay/verify', verificationPayload).subscribe({
      next: (res: any) => {
        this.alert.success('Razorpay payment successfully verified and recorded');
        this.toggleForm();
        this.loadPayments();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Payment verification failed:', err);
        this.alert.error(err.error?.message || 'Payment signature verification failed');
        this.loading = false;
      }
    });
  }
}
