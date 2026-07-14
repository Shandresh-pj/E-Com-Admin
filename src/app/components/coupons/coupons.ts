import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CouponService, Coupon } from '../../services/coupon.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTable
  ],
  templateUrl: './coupons.html',
  styleUrls: ['./coupons.scss'],
  encapsulation: ViewEncapsulation.None
})
export class Coupons implements OnInit {
  coupons: any[] = [];
  tableColumns = [
    { columnDef: 'code', header: 'Coupon Code' },
    { columnDef: '_discountStr', header: 'Discount' },
    { columnDef: '_expiryStr', header: 'Expiry Date' },
    { columnDef: '_usageStr', header: 'Usage' },
    { columnDef: '_statusStr', header: 'Status' }
  ];
  isLoading = false;

  // Inline form state — replaces MatDialog
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

  private buildForm(coupon: Coupon | null): FormGroup {
    return this.fb.group({
      id: [coupon?.id ?? null],
      code: [coupon?.code || '', Validators.required],
      type: [coupon?.type || 'percent', Validators.required],
      value: [coupon?.value ?? null],
      buy_x: [coupon?.buy_x ?? null],
      get_y: [coupon?.get_y ?? null],
      expiry_date: [coupon?.expiry_date ?? null],
      usage_limit: [coupon?.usage_limit ?? null],
      is_active: [coupon !== null ? coupon.is_active : true]
    });
  }

  openForm(coupon?: Coupon): void {
    this.editingCoupon = coupon ?? null;
    this.couponForm = this.buildForm(coupon ?? null);
    this.Coupon_Form = true;
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
    // Ensure numeric value for non-monetary types
    if (payload.type === 'bogo' || payload.type === 'free_shipping') {
      payload.value = 0;
    }

    if (payload.id) {
      this.couponService.updateCoupon(payload.id, payload).subscribe(() => {
        this.closeForm();
        this.loadCoupons();
      });
    } else {
      this.couponService.createCoupon(payload).subscribe(() => {
        this.closeForm();
        this.loadCoupons();
      });
    }
  }

  loadCoupons(): void {
    this.isLoading = true;
    this.couponService.getCoupons().subscribe({
      next: (res: any) => {
        const rawData = res.data ? res.data : res;
        this.coupons = rawData.map((c: any) => {
          let discountStr = '';
          if (c.type === 'percent') discountStr = `${c.value}%`;
          else if (c.type === 'flat') discountStr = `₹${c.value}`;
          else if (c.type === 'bogo') discountStr = `Buy ${c.buy_x} Get ${c.get_y}`;
          else if (c.type === 'free_shipping') discountStr = `Free Shipping`;

          return {
            ...c,
            _discountStr: discountStr,
            _expiryStr: c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : 'No Expiry',
            _usageStr: `${c.usage_count || 0} / ${c.usage_limit ? c.usage_limit : '∞'}`,
            _statusStr: c.is_active ? 'Active' : 'Inactive'
          };
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load coupons', err);
        this.isLoading = false;
      }
    });
  }

  deleteCoupon(couponOrId: any): void {
    const id = typeof couponOrId === 'string' ? couponOrId : (couponOrId?.id || couponOrId);
    if (confirm('Are you sure you want to delete this coupon?')) {
      this.couponService.deleteCoupon(id).subscribe(() => {
        this.loadCoupons();
      });
    }
  }
}
