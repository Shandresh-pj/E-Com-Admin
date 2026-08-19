import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CouponService, Coupon } from '../../services/coupon.service';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './coupons.html',
  styleUrls: ['./coupons.scss']
})
export class Coupons implements OnInit {
  coupons: any[] = [];
  isLoading = false;

  // Form state
  Coupon_Form = false;
  editingCoupon: Coupon | null = null;
  couponForm: FormGroup;

  constructor(
    private couponService: CouponService,
    private fb: FormBuilder
  ) {
    this.couponForm = this.buildForm(null);
  }

  ngOnInit(): void {
    this.loadCoupons();
  }

  // ── Computed Stats ──────────────────────────────────────────
  activeCount():  number { return this.coupons.filter(c => c.is_active).length; }
  percentCount(): number { return this.coupons.filter(c => c.type === 'percent').length; }
  bogoCount():    number { return this.coupons.filter(c => c.type === 'bogo').length; }

  // ── Form ────────────────────────────────────────────────────
  private buildForm(coupon: Coupon | null): FormGroup {
    return this.fb.group({
      id:              [coupon?.id ?? null],
      code:            [coupon?.code || '', [Validators.required]],
      type:            [coupon?.type || 'percent', Validators.required],
      value:           [coupon?.value ?? null],
      buy_x:           [coupon?.buy_x ?? null],
      get_y:           [coupon?.get_y ?? null],
      start_date:      [coupon?.start_date ?? null],
      expiry_date:     [coupon?.expiry_date ?? null],
      usage_limit:     [coupon?.usage_limit ?? null],
      per_user_limit:  [coupon?.per_user_limit ?? null],
      is_active:       [coupon !== null ? coupon.is_active : true]
    });
  }

  openForm(coupon?: Coupon): void {
    this.editingCoupon = coupon ?? null;
    this.couponForm = this.buildForm(coupon ?? null);
    this.Coupon_Form = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeForm(): void {
    this.Coupon_Form = false;
    this.editingCoupon = null;
    this.couponForm = this.buildForm(null);
  }

  saveCoupon(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.couponForm.value };
    if (!payload.id) delete payload.id;
    if (payload.type === 'bogo' || payload.type === 'free_shipping') payload.value = 0;

    const obs = this.editingCoupon?.id
      ? this.couponService.updateCoupon(this.editingCoupon.id, payload)
      : this.couponService.createCoupon(payload);

    obs.subscribe({
      next: () => {
        this.closeForm();
        this.loadCoupons();
      },
      error: (err: any) => {
        console.error('[Coupons] Save failed', err);
      }
    });
  }

  loadCoupons(): void {
    this.isLoading = true;
    this.couponService.getCoupons().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];
        this.coupons = raw.map((c: any) => {
          let _discountStr = '';
          if (c.type === 'percent')       _discountStr = `${c.value}% OFF`;
          else if (c.type === 'flat')     _discountStr = `₹${c.value} OFF`;
          else if (c.type === 'bogo')     _discountStr = `Buy ${c.buy_x} Get ${c.get_y}`;
          else if (c.type === 'free_shipping') _discountStr = 'Free Shipping';

          return {
            ...c,
            _discountStr,
            _startDateStr:    c.start_date  ? new Date(c.start_date).toLocaleDateString()  : 'Immediate',
            _expiryStr:       c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : 'No Expiry',
            _usageStr:        `${c.usage_count || 0} / ${c.usage_limit ?? '∞'}`,
            _perUserLimitStr: c.per_user_limit ? `${c.per_user_limit} / user` : 'No Limit',
          };
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('[Coupons] Load failed', err);
        this.isLoading = false;
      }
    });
  }

  deleteCoupon(couponOrId: any): void {
    const id = typeof couponOrId === 'number' || typeof couponOrId === 'string'
      ? couponOrId
      : couponOrId?.id;
    if (!confirm('Delete this coupon? This action cannot be undone.')) return;
    this.couponService.deleteCoupon(id).subscribe(() => this.loadCoupons());
  }

  toggleStatus(couponOrId: any): void {
    const id = typeof couponOrId === 'number' || typeof couponOrId === 'string'
      ? couponOrId
      : couponOrId?.id;
    this.couponService.toggleStatus(id).subscribe(() => this.loadCoupons());
  }
}
