import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { CommonService } from '../../Securities/Services/common.service';
import { AlertService } from '../../Securities/Services/alert.service';
import { RazorpayService } from '../../services/razorpay.service';
import { FormsModule } from '@angular/forms';
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
  isLoading = signal(false);

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

    const createOrderPayload = {
      amount:   this.amountToPay() * 100, // INR → paise
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`
    };

    this.commonService.postApi('payment/create-order', createOrderPayload).subscribe({
      next: async (res: any) => {
        if (!res.success) {
          this.isLoading.set(false);
          this.alert.error(res.message || 'Failed to create payment order.');
          return;
        }

        const keyId = environment.razorpayKeyId || 'rzp_test_simulated_key';

        try {
          await this.razorpayService.openCheckout({
            key:         keyId,
            amount:      res.amount,
            currency:    res.currency,
            name:        'SVK E-Commerce Store',
            description: 'Standard Payment Checkout',
            order_id:    res.order_id,
            prefill: {
              name:    '',
              email:   '',
              contact: ''
            },
            theme: { color: '#6366f1' },
            handler: (response: any) => {
              this.verifyPayment(response);
            },
            modal: {
              ondismiss: () => {
                this.isLoading.set(false);
                this.alert.warning('Payment was cancelled. No charges were made.');
              }
            }
          });
        } catch (err: any) {
          this.isLoading.set(false);
          this.alert.error('Failed to open payment gateway. Please try again.');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.alert.error(err?.error?.message || 'Failed to connect to the payment server.');
      }
    });
  }

  verifyPayment(paymentResponse: any): void {
    const payload = {
      razorpay_order_id:   paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature:  paymentResponse.razorpay_signature
    };

    this.commonService.postApi('payment/verify-payment', payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success) {
          this.alert.success('Payment successful and verified! Thank you for your purchase.');
        } else {
          this.alert.error('Payment verification failed. Please contact support.');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.alert.error(err?.error?.message || 'Signature mismatch or verification error. Contact support.');
      }
    });
  }
}
