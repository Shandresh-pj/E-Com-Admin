import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { CommonService } from '../../Securities/Services/common.service';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  amountToPay = signal(100); // Default to INR 100
  isLoading = signal(false);

  constructor(
    private commonService: CommonService,
    private razorpayService: RazorpayService,
    private snackBar: MatSnackBar
  ) {}

  async payNow() {
    if (this.amountToPay() < 1) {
      this.snackBar.open('Minimum amount is ₹1', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading.set(true);
    
    // Step 1: Create Order on Backend
    const createOrderPayload = {
      amount: this.amountToPay() * 100, // convert INR to paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    };

    this.commonService.postApi('payment/create-order', createOrderPayload).subscribe({
      next: async (res: any) => {
        if (!res.success) {
          this.isLoading.set(false);
          this.snackBar.open('Error creating order', 'Close', { duration: 3000 });
          return;
        }

        // Use environment variable if available, fallback to the requested key
        const keyId = environment.razorpayKeyId || 'rzp_test_TE4sr2G8bmm7c3';

        // Step 2: Open Razorpay Modal
        await this.razorpayService.openCheckout({
          key: keyId,
          amount: res.amount,
          currency: res.currency,
          name: 'Your E-Commerce Store',
          description: 'Standard Payment Checkout',
          order_id: res.order_id,
          prefill: {
            name: 'John Doe',
            email: 'johndoe@example.com',
            contact: '9999999999'
          },
          theme: {
            color: '#3b82f6'
          },
          handler: (response: any) => {
            this.verifyPayment(response);
          },
          modal: {
            ondismiss: () => {
              this.isLoading.set(false);
              this.snackBar.open('Payment was cancelled by the user', 'Close', { duration: 3000 });
            }
          }
        });
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.snackBar.open(err.error?.message || 'Failed to connect to payment server', 'Close', { duration: 3000 });
      }
    });
  }

  verifyPayment(paymentResponse: any) {
    const payload = {
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature
    };

    this.commonService.postApi('payment/verify-payment', payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success) {
          this.snackBar.open('Payment Successful & Verified!', 'Great', { duration: 5000, panelClass: 'success-snackbar' });
        } else {
          this.snackBar.open('Payment Verification Failed', 'Close', { duration: 4000 });
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.snackBar.open(err.error?.message || 'Signature mismatch or verification error', 'Close', { duration: 4000 });
      }
    });
  }
}
