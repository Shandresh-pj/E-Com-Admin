import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { CommonService } from '../../Securities/Services/common.service';
import { AlertService } from '../../Securities/Services/alert.service';
import { RazorpayService, RazorpayPaymentError } from '../../services/razorpay.service';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-standard-checkout',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './standard-checkout.html',
  styleUrls: ['./standard-checkout.scss']
})
export class StandardCheckoutComponent {
  amountToPay = signal(499); // Default ₹499
  isLoading = signal(false);
  couponCode = signal('');
  appliedCoupon = signal<any>(null);
  discountAmount = signal(0);
  isVerifyingCoupon = signal(false);
  customerName = signal('');
  customerEmail = signal('');
  customerPhone = signal('');

  presets = [100, 499, 999, 2499, 4999];

  constructor(
    private commonService: CommonService,
    private razorpayService: RazorpayService,
    private alert: AlertService
  ) {}

  selectPreset(amt: number): void {
    this.amountToPay.set(amt);
    if (this.appliedCoupon()) {
      this.recalculateDiscount();
    }
  }

  updateAmount(val: number): void {
    this.amountToPay.set(Math.max(1, Number(val) || 1));
    if (this.appliedCoupon()) {
      this.recalculateDiscount();
    }
  }

  subtotal = computed(() => this.amountToPay());
  
  gstAmount = computed(() => {
    const base = Math.max(0, this.subtotal() - this.discountAmount());
    return Math.round(base * 0.18);
  });

  totalPayable = computed(() => {
    const base = Math.max(0, this.subtotal() - this.discountAmount());
    return base + this.gstAmount();
  });

  applyCoupon(): void {
    const code = this.couponCode().trim().toUpperCase();
    if (!code) {
      this.alert.warning('Please enter a coupon code.');
      return;
    }

    this.isVerifyingCoupon.set(true);
    this.commonService.postApi('subscription-coupons/validate', {
      code,
      amount: this.amountToPay()
    }).subscribe({
      next: (res: any) => {
        this.isVerifyingCoupon.set(false);
        if (res?.success && res.data) {
          const cData = res.data;
          this.appliedCoupon.set(cData.coupon);
          this.discountAmount.set(cData.discount_amount || 0);
          this.alert.success(`Coupon ${code} applied! Saved ₹${cData.discount_amount}`, 'Coupon Applied 🎉');
        } else {
          this.alert.error(res?.message || 'Invalid or expired coupon code.');
        }
      },
      error: (err: any) => {
        this.isVerifyingCoupon.set(false);
        this.alert.error(err?.error?.message || 'Failed to validate coupon code.');
      }
    });
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponCode.set('');
    this.discountAmount.set(0);
    this.alert.info('Coupon code removed.');
  }

  private recalculateDiscount(): void {
    if (!this.appliedCoupon()) return;
    const coupon = this.appliedCoupon();
    let disc = 0;
    const amount = this.amountToPay();
    if (coupon.discount_type === 'percentage') {
      disc = (amount * (coupon.discount_value || 0)) / 100;
    } else if (coupon.discount_type === 'flat') {
      disc = coupon.discount_value || 0;
    }
    this.discountAmount.set(Math.min(disc, amount));
  }

  async payNow(): Promise<void> {
    const payable = this.totalPayable();
    if (payable < 1) {
      this.alert.warning('Minimum payment amount is ₹1.');
      return;
    }

    this.isLoading.set(true);

    // Step 1 – Create order on backend (in paise)
    this.commonService.postApi('payment/create-order', {
      amount: payable * 100,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    }).subscribe({
      next: async (res: any) => {
        if (!res?.success || !res.order_id) {
          this.isLoading.set(false);
          this.alert.error(res?.message || 'Failed to initialize payment gateway order.');
          return;
        }

        const keyId = environment.razorpayKeyId || res.key_id || 'rzp_test_simulated_key';

        try {
          // Step 2 – Open Razorpay Standard Checkout
          const rzpResp = await this.razorpayService.openCheckout({
            key: keyId,
            amount: res.amount,
            currency: res.currency || 'INR',
            name: 'SVK Cyber Store',
            description: 'Instant Cyber Payment Checkout',
            order_id: res.order_id,
            prefill: {
              name: this.customerName(),
              email: this.customerEmail(),
              contact: this.customerPhone()
            },
            theme: { color: '#6366f1' },
            modal: { backdropclose: false, escape: true, animation: true },
            retry: { enabled: true, max_count: 3 }
          });

          // Step 3 – Verify signature on backend
          this.verifyPayment(rzpResp);

        } catch (err: any) {
          this.isLoading.set(false);
          if (err?.dismissed === true) {
            this.alert.warning('Payment window closed. No transaction was completed.', 'Cancelled');
          } else {
            const rzpErr = err as RazorpayPaymentError;
            const msg = rzpErr?.description || 'Payment failed. Please try a different card or UPI method.';
            this.alert.error(msg, 'Payment Failed');
          }
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.alert.error(err?.error?.message || 'Payment server connection error.');
      }
    });
  }

  private verifyPayment(paymentResponse: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): void {
    this.commonService.postApi('payment/verify-payment', {
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature
    }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res?.success) {
          this.alert.success('Payment verified and order processed successfully!', 'Payment Success 🎉');
        } else {
          this.alert.error(res?.message || 'Payment verification mismatch.', 'Verification Error');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.alert.error(err?.error?.message || 'Verification signature mismatch.', 'Verification Error');
      }
    });
  }
}
