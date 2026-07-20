import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators,
  FormsModule, ReactiveFormsModule, FormControl
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SubscriptionPlan, SubscriptionService } from 'src/app/services/subscription.service';
import { RazorpayService, RazorpayPaymentError } from 'src/app/services/razorpay.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule } from '@angular/router';

export interface SubscriptionModalData {
  plan: SubscriptionPlan;
  billingCycle: 'Monthly' | 'Yearly';
  initialMode: 'trial' | 'pay';
  hasActiveTrialOrSub?: boolean;
}

@Component({
  selector: 'app-subscription-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule, RouterModule],
  templateUrl: './subscription-checkout-modal.component.html',
  styleUrls: ['./subscription-checkout-modal.component.scss']
})
export class SubscriptionCheckoutModalComponent implements OnInit {
  checkoutForm: FormGroup;
  mode = signal<'trial' | 'pay'>('trial');
  hasActiveTrialOrSub = signal(false);
  loading = signal(false);
  razorpayOpen = signal(false);
  isSuccess = signal(false);
  successMessage = signal('');
  receiptData = signal<any>(null);

  couponControl = new FormControl('');
  applyingCoupon = signal(false);
  appliedCoupon = signal<any>(null);
  discountAmount = signal(0);
  finalAmount = signal(0);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SubscriptionCheckoutModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionModalData,
    private subscriptionService: SubscriptionService,
    private razorpayService: RazorpayService,
    private alert: AlertService
  ) {
    const isTrialDisabled = data.hasActiveTrialOrSub === true;
    this.hasActiveTrialOrSub.set(isTrialDisabled);
    this.mode.set(isTrialDisabled ? 'pay' : data.initialMode);

    this.checkoutForm = this.fb.group({
      name:    ['', [Validators.required, Validators.minLength(2)]],
      email:   ['', [Validators.required, Validators.email]],
      phone:   ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      company: ['', []],
      gstin:   ['', []]
    });
  }

  ngOnInit(): void {
    this.finalAmount.set(this.originalPrice);
  }

  setMode(m: 'trial' | 'pay'): void { this.mode.set(m); }

  get originalPrice(): number {
    return this.data.billingCycle === 'Monthly'
      ? this.data.plan.monthlyPrice
      : this.data.plan.yearlyPrice;
  }

  get price(): number { return this.finalAmount(); }
  get formattedOriginalPrice(): string { return this.originalPrice.toLocaleString('en-IN'); }
  get formattedPrice(): string { return this.price.toLocaleString('en-IN'); }

  applyCoupon(): void {
    const code = this.couponControl.value?.trim();
    if (!code) return;

    this.applyingCoupon.set(true);
    this.subscriptionService.validateCoupon(code, this.originalPrice).subscribe({
      next: (res: any) => {
        this.applyingCoupon.set(false);
        if (res.success) {
          this.appliedCoupon.set(res.data.coupon);
          this.discountAmount.set(res.data.discount_amount);
          this.finalAmount.set(res.data.final_amount);
          this.alert.success(`Coupon "${code}" applied! Saved ₹${res.data.discount_amount.toLocaleString('en-IN')}`);
        } else {
          this.alert.warning(res.message || 'Invalid or expired coupon code.');
        }
      },
      error: (err: any) => {
        this.applyingCoupon.set(false);
        this.alert.error(err?.error?.message || 'Could not validate coupon. Please try again.');
      }
    });
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.discountAmount.set(0);
    this.finalAmount.set(this.originalPrice);
    this.couponControl.setValue('');
  }

  onClose(): void { this.dialogRef.close(); }

  async onSubmit(): Promise<void> {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.alert.warning('Please fill in all required fields correctly before proceeding.');
      return;
    }

    const val = this.checkoutForm.value;
    this.loading.set(true);

    // ─── Free Trial ────────────────────────────────────────────────────────
    if (this.mode() === 'trial') {
      this.subscriptionService.startFreeTrial({
        planId:       this.data.plan.id,
        billingCycle: this.data.billingCycle,
        name:         val.name,
        email:        val.email,
        phone:        val.phone,
        company:      val.company
      }).subscribe({
        next: (res) => {
          this.loading.set(false);
          const expiry = new Date(res.expiryDate).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          });
          this.isSuccess.set(true);
          this.successMessage.set(`🎉 14-Day Free Trial activated for ${val.company || val.name}!`);
          this.receiptData.set({
            plan:          this.data.plan.name,
            cycle:         '14-Day Free Trial (₹0 Charged)',
            expiry,
            transactionId: res.trialId || `TRIAL-${Date.now()}`
          });
          this.subscriptionService.notifySubscriptionUpdated();
          this.alert.success(
            `Your 14-day free trial for ${this.data.plan.name} has been activated!`,
            'Free Trial Activated 🎉'
          );
        },
        error: (err: any) => {
          this.loading.set(false);
          const msg = err?.error?.message || 'Free trial already activated. Please purchase a plan.';
          this.alert.warning(msg, 'Trial Unavailable');
        }
      });
      return;
    }

    // ─── Razorpay Payment ─────────────────────────────────────────────────
    this.subscriptionService.createRazorpayOrder({
      planId:       this.data.plan.id,
      billingCycle: this.data.billingCycle,
      amount:       this.price,
      name:         val.name,
      email:        val.email,
      phone:        val.phone,
      company:      val.company,
      coupon_code:  this.appliedCoupon()?.code
    }).subscribe({
      next: async (orderRes) => {
        this.loading.set(false);

        if (!orderRes?.orderId) {
          this.alert.error('Failed to create payment order. Please try again.', 'Order Error');
          return;
        }

        // Hide our dialog while Razorpay modal is open
        this.razorpayOpen.set(true);
        this.dialogRef.addPanelClass('hidden-dialog');

        try {
          // Opens Razorpay checkout; resolves on payment success, rejects on failure/dismiss
          const rzpResp = await this.razorpayService.openCheckout({
            key:         orderRes.keyId,
            amount:      orderRes.amount,
            currency:    orderRes.currency || 'INR',
            name:        'SVK Cyber E-Com Admin',
            description: `${this.data.plan.name} – ${this.data.billingCycle} Plan`,
            order_id:    orderRes.orderId,
            prefill: {
              name:    val.name,
              email:   val.email,
              contact: val.phone
            },
            notes: {
              plan_name:     this.data.plan.name,
              billing_cycle: this.data.billingCycle
            },
            theme:  { color: '#6366f1' },
            modal:  { backdropclose: false, escape: true, animation: true },
            retry:  { enabled: true, max_count: 3 }
          });

          // Payment succeeded – verify signature on backend
          this.loading.set(true);
          this.subscriptionService.verifyPayment({
            razorpay_payment_id: rzpResp.razorpay_payment_id,
            razorpay_order_id:   rzpResp.razorpay_order_id,
            razorpay_signature:  rzpResp.razorpay_signature,
            planId: this.data.plan.id,
            email:  val.email
          }).subscribe({
            next: () => {
              this.razorpayOpen.set(false);
              this.dialogRef.removePanelClass('hidden-dialog');
              this.loading.set(false);
              this.isSuccess.set(true);
              this.successMessage.set(`⚡ Payment Verified! ${this.data.plan.name} Plan activated.`);
              this.receiptData.set({
                plan:          this.data.plan.name,
                cycle:         `${this.data.billingCycle} Subscription`,
                amount:        `₹${this.formattedPrice}`,
                transactionId: rzpResp.razorpay_payment_id
              });
              this.subscriptionService.notifySubscriptionUpdated();
              this.alert.success(
                `Payment of ₹${this.formattedPrice} verified! ${this.data.plan.name} (${this.data.billingCycle}) is now active.`,
                'Payment Successful! 🎉'
              );
            },
            error: (err: any) => {
              this.razorpayOpen.set(false);
              this.dialogRef.removePanelClass('hidden-dialog');
              this.loading.set(false);
              const errMsg = err?.error?.message || 'Signature verification failed. Contact support with your Payment ID.';
              this.alert.error(errMsg, 'Verification Failed');
            }
          });

        } catch (err: any) {
          // Restore our dialog on every failure path
          this.razorpayOpen.set(false);
          this.dialogRef.removePanelClass('hidden-dialog');
          this.loading.set(false);

          if (err?.dismissed === true) {
            this.alert.warning('Payment cancelled. You can try again anytime.', 'Cancelled');
          } else {
            // RazorpayPaymentError from the payment.failed event
            const rzpErr = err as RazorpayPaymentError;
            const userMsg = rzpErr?.description
              || 'Payment could not be completed. Please try a different payment method.';
            this.alert.error(userMsg, 'Payment Failed');
          }
        }
      },

      error: (err: any) => {
        this.loading.set(false);
        const httpStatus = err?.status;
        const message    = err?.error?.message || 'Failed to initialize payment. Please try again.';
        if (httpStatus === 401) {
          this.alert.error('Payment gateway authentication failed. Contact support.', 'Auth Error');
        } else if (httpStatus === 400) {
          this.alert.warning(message, 'Invalid Request');
        } else {
          this.alert.error(message, 'Order Error');
        }
      }
    });
  }
}
