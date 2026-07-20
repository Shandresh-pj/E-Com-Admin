import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators,
  FormsModule, ReactiveFormsModule, FormControl
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SubscriptionPlan, SubscriptionService } from 'src/app/services/subscription.service';
import { RazorpayService } from 'src/app/services/razorpay.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule } from '@angular/router';

export interface SubscriptionModalData {
  plan: SubscriptionPlan;
  billingCycle: 'Monthly' | 'Yearly';
  initialMode: 'trial' | 'pay';
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
  loading = signal(false);
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
    this.mode.set(data.initialMode);

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

  setMode(m: 'trial' | 'pay'): void {
    this.mode.set(m);
  }

  get originalPrice(): number {
    return this.data.billingCycle === 'Monthly'
      ? this.data.plan.monthlyPrice
      : this.data.plan.yearlyPrice;
  }

  get price(): number {
    return this.finalAmount();
  }

  get formattedOriginalPrice(): string {
    return this.originalPrice.toLocaleString('en-IN');
  }

  get formattedPrice(): string {
    return this.price.toLocaleString('en-IN');
  }

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

  onClose(): void {
    this.dialogRef.close();
  }

  async onSubmit(): Promise<void> {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.alert.warning('Please fill in all required fields correctly before proceeding.');
      return;
    }

    const val = this.checkoutForm.value;
    this.loading.set(true);

    if (this.mode() === 'trial') {
      // ─── Start 14-Day Free Trial ─────────────────────────────
      this.subscriptionService.startFreeTrial({
        planId: this.data.plan.id,
        billingCycle: this.data.billingCycle,
        name: val.name,
        email: val.email,
        phone: val.phone,
        company: val.company
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
        },
        error: (err: any) => {
          this.loading.set(false);
          this.alert.error(err?.error?.message || 'Failed to activate trial. Please try again.');
        }
      });

    } else {
      // ─── Initiate Razorpay Payment ───────────────────────────
      this.subscriptionService.createRazorpayOrder({
        planId:        this.data.plan.id,
        billingCycle:  this.data.billingCycle,
        amount:        this.price,
        name:          val.name,
        email:         val.email,
        phone:         val.phone,
        company:       val.company,
        coupon_code:   this.appliedCoupon()?.code
      }).subscribe({
        next: async (orderRes) => {
          try {
            await this.razorpayService.openCheckout({
              key:         orderRes.keyId || 'rzp_test_simulated_key',
              amount:      orderRes.amount,
              currency:    orderRes.currency || 'INR',
              name:        'SVK Cyber E-Com Admin',
              description: `${this.data.plan.name} (${this.data.billingCycle})`,
              order_id:    orderRes.orderId,
              prefill: {
                name:    val.name,
                email:   val.email,
                contact: val.phone
              },
              theme: { color: '#6366f1' },
              handler: (rzpResp) => {
                // Verify on backend after Razorpay success
                this.subscriptionService.verifyPayment({
                  ...rzpResp,
                  planId: this.data.plan.id,
                  email:  val.email
                }).subscribe({
                  next: () => {
                    this.loading.set(false);
                    this.isSuccess.set(true);
                    this.successMessage.set(`⚡ Payment Verified! ${this.data.plan.name} Plan activated.`);
                    this.receiptData.set({
                      plan:          this.data.plan.name,
                      cycle:         `${this.data.billingCycle} Subscription`,
                      amount:        `₹${this.formattedPrice}`,
                      transactionId: rzpResp.razorpay_payment_id || `PAY-${Date.now()}`
                    });
                  },
                  error: (err: any) => {
                    this.loading.set(false);
                    this.alert.error(err?.error?.message || 'Payment verification failed. Contact support with your payment ID.');
                  }
                });
              },
              modal: {
                ondismiss: () => {
                  this.loading.set(false);
                  this.alert.warning('Payment was cancelled. Your order has not been placed.');
                }
              }
            });
          } catch (err: any) {
            this.loading.set(false);
            this.alert.error('Failed to open payment gateway. Please try again.');
          }
        },
        error: (err: any) => {
          this.loading.set(false);
          this.alert.error(err?.error?.message || 'Failed to initialize payment order. Please try again.');
        }
      });
    }
  }
}
