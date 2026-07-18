import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { CommonService } from '../../Securities/Services/common.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-subscription-coupons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './subscription-coupons.html',
  styleUrls: ['./subscription-coupons.scss']
})
export class SubscriptionCouponsComponent implements OnInit {
  coupons = signal<any[]>([]);
  isLoading = signal(false);
  couponForm: FormGroup;
  showForm = signal(false);

  discountTypes = [
    { value: 'percentage', label: 'Percentage' },
    { value: 'flat', label: 'Flat Amount' },
    { value: 'extra_days', label: 'Extra Days' },
    { value: 'extra_months', label: 'Extra Months' },
    { value: 'free_trial_extension', label: 'Free Trial Extension' },
    { value: 'renewal', label: 'Renewal Discount' },
    { value: 'first_purchase', label: 'First Purchase' },
    { value: 'referral', label: 'Referral' },
    { value: 'buy_x_get_y', label: 'Buy X Get Y' }
  ];

  constructor(
    private commonService: CommonService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.couponForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      discount_type: ['percentage', Validators.required],
      discount_value: [null],
      buy_x_months: [null],
      get_y_months: [null],
      free_trial_days: [null],
      usage_limit: [0],
      min_order_value: [null],
      valid_from: [null],
      valid_until: [null],
      is_active: [true]
    });
  }

  ngOnInit() {
    this.fetchCoupons();
  }

  fetchCoupons() {
    this.isLoading.set(true);
    this.commonService.getApi('subscription-coupons').subscribe({
      next: (res: any) => {
        if (res.success) {
          this.coupons.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to load coupons', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit() {
    if (this.couponForm.valid) {
      this.isLoading.set(true);
      this.commonService.postApi('subscription-coupons', this.couponForm.value).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.snackBar.open('Coupon created successfully', 'Close', { duration: 3000 });
            this.showForm.set(false);
            this.couponForm.reset({ is_active: true, usage_limit: 0, discount_type: 'percentage' });
            this.fetchCoupons();
          }
          this.isLoading.set(false);
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.snackBar.open(err.error?.message || 'Error creating coupon', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
