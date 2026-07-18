import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubscriptionPlan, SubscriptionService } from 'src/app/services/subscription.service';
import { RazorpayService } from 'src/app/services/razorpay.service';
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
    private snackBar: MatSnackBar
  ) {
    this.mode.set(data.initialMode);

    this.checkoutForm = this.fb.group({
      name: ['Shandresh PJ', [Validators.required, Validators.minLength(2)]],
      email: ['shandresh@svkecom.io', [Validators.required, Validators.email]],
      phone: ['9876543210', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      company: ['SVK Enterprise Retail Hub', []],
      gstin: ['29AAACT1234A1Z1', []]
    });
  }

  ngOnInit(): void {
    this.finalAmount.set(this.originalPrice);
  }

  setMode(m: 'trial' | 'pay') {
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
    const code = this.couponControl.value;
    if (!code) return;

    this.applyingCoupon.set(true);
    // Assuming subscriptionService has a method to validate coupon
    this.subscriptionService.validateCoupon(code, this.originalPrice).subscribe({
      next: (res: any) => {
        this.applyingCoupon.set(false);
        if (res.success) {
          this.appliedCoupon.set(res.data.coupon);
          this.discountAmount.set(res.data.discount_amount);
          this.finalAmount.set(res.data.final_amount);
          this.snackBar.open('Coupon Applied Successfully!', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open(res.message || 'Invalid coupon.', 'Close', { duration: 3000 });
        }
      },
      error: (err: any) => {
        this.applyingCoupon.set(false);
        this.snackBar.open(err.error?.message || 'Error applying coupon.', 'Close', { duration: 3000 });
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  async onSubmit(): Promise<void> {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.snackBar.open('Please fill in all required fields correctly.', 'OK', { duration: 3000 });
      return;
    }

    const val = this.checkoutForm.value;
    this.loading.set(true);

    if (this.mode() === 'trial') {
      // Initiate 14-Day Free Trial
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
          this.isSuccess.set(true);
          this.successMessage.set(`🎉 14-Day Free Trial successfully activated for ${val.company || val.name}!`);
          this.receiptData.set({
            plan: this.data.plan.name,
            cycle: '14-Day Free Trial (₹0 Charged)',
            expiry: new Date(res.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            transactionId: res.trialId || `TRIAL-${Date.now()}`
          });
          this.snackBar.open(this.successMessage(), 'View Dashboard', { duration: 6000, panelClass: ['success-snackbar'] });
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Error activating trial. Please check network.', 'Close', { duration: 4000 });
        }
      });
    } else {
      // Initiate Razorpay Order & Payment
      this.subscriptionService.createRazorpayOrder({
        planId: this.data.plan.id,
        billingCycle: this.data.billingCycle,
        amount: this.price,
        name: val.name,
        email: val.email,
        phone: val.phone,
        company: val.company,
        coupon_code: this.appliedCoupon()?.code
      }).subscribe({
        next: async (orderRes) => {
          // Open Razorpay Checkout overlay
          await this.razorpayService.openCheckout({
            key: orderRes.keyId || 'rzp_test_simulated_key',
            amount: orderRes.amount,
            currency: orderRes.currency || 'INR',
            name: 'SVK Cyber E-Com Admin',
            description: `${this.data.plan.name} (${this.data.billingCycle})`,
            order_id: orderRes.orderId,
            prefill: {
              name: val.name,
              email: val.email,
              contact: val.phone
            },
            theme: {
              color: '#6366f1'
            },
            handler: (rzpResp) => {
              // Verify payment on backend
              this.subscriptionService.verifyPayment({
                ...rzpResp,
                planId: this.data.plan.id,
                email: val.email
              }).subscribe({
                next: (verifyRes) => {
                  this.loading.set(false);
                  this.isSuccess.set(true);
                  this.successMessage.set(`⚡ Razorpay Payment Verified! ${this.data.plan.name} Suite activated.`);
                  this.receiptData.set({
                    plan: this.data.plan.name,
                    cycle: `${this.data.billingCycle} Subscription`,
                    amount: `₹${this.formattedPrice}`,
                    transactionId: rzpResp.razorpay_payment_id || `PAY-${Date.now()}`
                  });
                  this.snackBar.open(this.successMessage(), 'View Dashboard', { duration: 6000, panelClass: ['success-snackbar'] });
                },
                error: () => {
                  this.loading.set(false);
                  this.snackBar.open('Payment verification failed.', 'Close', { duration: 4000 });
                }
              });
            },
            modal: {
              ondismiss: () => {
                this.loading.set(false);
                this.snackBar.open('Payment cancelled.', 'Close', { duration: 3000 });
              }
            }
          });
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Error initializing payment order.', 'Close', { duration: 4000 });
        }
      });
    }
  }
}
