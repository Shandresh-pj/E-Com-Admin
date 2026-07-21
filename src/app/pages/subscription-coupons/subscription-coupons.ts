import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { CommonService } from '../../Securities/Services/common.service';
import { AlertService } from '../../Securities/Services/alert.service';

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
  showForm = signal(false);
  searchQuery = signal('');
  selectedFilter = signal<'all' | 'active' | 'inactive'>('all');
  copiedCode = signal<string | null>(null);

  couponForm: FormGroup;

  discountTypes = [
    { value: 'percentage', label: 'Percentage (%)', icon: 'percent' },
    { value: 'flat', label: 'Flat Amount (₹)', icon: 'payments' },
    { value: 'extra_days', label: 'Extra Days', icon: 'today' },
    { value: 'extra_months', label: 'Extra Months', icon: 'date_range' },
    { value: 'free_trial_extension', label: 'Free Trial Extension', icon: 'card_giftcard' },
    { value: 'buy_x_get_y', label: 'Buy X Get Y', icon: 'shopping_bag' }
  ];

  constructor(
    private commonService: CommonService,
    private fb: FormBuilder,
    private alert: AlertService
  ) {
    this.couponForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(30), Validators.pattern('^[A-Z0-9_-]+$')]],
      discount_type: ['percentage', Validators.required],
      discount_value: [10, [Validators.min(0)]],
      buy_x_months: [1],
      get_y_months: [1],
      free_trial_days: [7],
      usage_limit: [100],
      min_order_value: [0],
      valid_from: [''],
      valid_until: [''],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.fetchCoupons();
  }

  fetchCoupons(): void {
    this.isLoading.set(true);
    this.commonService.getApi('subscription-coupons').subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.coupons.set(res.data || []);
        } else {
          this.coupons.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.alert.error(err?.error?.message || 'Failed to load subscription coupons.');
      }
    });
  }

  filteredCoupons = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();
    return this.coupons().filter(c => {
      const matchSearch = !q || (c.code || '').toLowerCase().includes(q) || (c.discount_type || '').toLowerCase().includes(q);
      const matchFilter = filter === 'all' || (filter === 'active' && c.is_active) || (filter === 'inactive' && !c.is_active);
      return matchSearch && matchFilter;
    });
  });

  copyCode(code: string): void {
    navigator.clipboard.writeText(code);
    this.copiedCode.set(code);
    this.alert.success(`Coupon code ${code} copied to clipboard!`, 'Copied!');
    setTimeout(() => this.copiedCode.set(null), 2500);
  }

  toggleForm(): void {
    this.showForm.set(!this.showForm());
    if (this.showForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  formatCodeInput(event: any): void {
    const val = (event.target.value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    this.couponForm.get('code')?.setValue(val, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      this.alert.warning('Please complete all required coupon fields correctly.');
      return;
    }

    this.isLoading.set(true);
    const formVal = this.couponForm.value;

    this.commonService.postApi('subscription-coupons', formVal).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res?.success) {
          this.alert.success(`Coupon ${formVal.code} created successfully!`, 'Coupon Created 🎉');
          this.showForm.set(false);
          this.couponForm.reset({
            code: '',
            discount_type: 'percentage',
            discount_value: 10,
            usage_limit: 100,
            is_active: true
          });
          this.fetchCoupons();
        } else {
          this.alert.error(res?.message || 'Failed to create coupon.');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.alert.error(err?.error?.message || 'Error creating coupon.');
      }
    });
  }

  getBadgeText(c: any): string {
    switch (c.discount_type) {
      case 'percentage': return `${c.discount_value}% OFF`;
      case 'flat': return `₹${c.discount_value} OFF`;
      case 'extra_days': return `+${c.discount_value} Extra Days`;
      case 'extra_months': return `+${c.discount_value} Extra Months`;
      case 'free_trial_extension': return `+${c.free_trial_days || c.discount_value} Trial Days`;
      case 'buy_x_get_y': return `Buy ${c.buy_x_months} Get ${c.get_y_months} Free`;
      default: return `${c.discount_value || 'PROMO'} OFF`;
    }
  }
}
