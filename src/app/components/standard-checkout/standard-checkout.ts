import { Component, signal } from '@angular/core';
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
  amountToPay = signal(100); // Default ₹100
  isLoading   = signal(false);

  constructor(
    private commonService: CommonService,
    private razorpayService: RazorpayService,
    private alert: AlertService
  ) {}

  async payNow(): Promise<void> {
    if (this.amountToPay() < 1) {
      this.alert.warning('Minimum payment amount is ₹1.');
      return;
    }

    this.isLoading.set(true);

    // Step 1 – Create order on backend
    this.commonService.postApi('payment/create-order', {
      amount:   this.amountToPay() * 100, // INR → paise
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`
    }).subscribe({
      next: async (res: any) => {
        if (!res?.success || !res.order_id) {
          this.isLoading.set(false);
          this.alert.error(res?.message || 'Failed to create payment order.');
          return;
        }

        const keyId = environment.razorpayKeyId || res.key_id || 'rzp_test_simulated_key';

        try {
          // Step 2 – Open Razorpay checkout (Promise resolves on success, rejects on failure/dismiss)
          const rzpResp = await this.razorpayService.openCheckout({
            key:         keyId,
            amount:      res.amount,
            currency:    res.currency || 'INR',
            name:        'SVK E-Commerce Store',
            description: 'Standard Payment Checkout',
            order_id:    res.order_id,
            prefill:     { name: '', email: '', contact: '' },
            theme:       { color: '#6366f1' },
            modal:       { backdropclose: false, escape: true, animation: true },
            retry:       { enabled: true, max_count: 3 }
          });

          // Step 3 – Verify signature on backend
          this.verifyPayment(rzpResp);

        } catch (err: any) {
          this.isLoading.set(false);

          if (err?.dismissed === true) {
            this.alert.warning('Payment was cancelled. No charges were made.', 'Cancelled');
          } else {
            // payment.failed event from Razorpay
            const rzpErr = err as RazorpayPaymentError;
            const msg = rzpErr?.description || 'Payment could not be completed. Please try a different method.';
            this.alert.error(msg, 'Payment Failed');
          }
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.alert.error(err?.error?.message || 'Failed to connect to the payment server.');
      }
    });
  }

  private verifyPayment(paymentResponse: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): void {
    this.commonService.postApi('payment/verify-payment', {
      razorpay_order_id:   paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature:  paymentResponse.razorpay_signature
    }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res?.success) {
          this.alert.success('Payment successful and verified! Thank you for your purchase.', 'Success 🎉');
        } else {
          this.alert.error(res?.message || 'Payment verification failed. Please contact support.', 'Verification Failed');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.alert.error(err?.error?.message || 'Signature mismatch or verification error. Contact support.', 'Verification Error');
      }
    });
  }
}
