import { Component, OnInit, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { CouponService, Coupon } from '../../services/coupon.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [
    CommonModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatCardModule, 
    MatDialogModule,
    MatChipsModule,
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

  constructor(private couponService: CouponService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadCoupons();
  }

  loadCoupons(): void {
    this.isLoading = true;
    this.couponService.getCoupons().subscribe({
      next: (res: any) => {
        const rawData = res.data ? res.data : res;
        this.coupons = rawData.map((c: any) => ({
          ...c,
          _discountStr: c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`,
          _expiryStr: new Date(c.expiryDate).toLocaleDateString(),
          _usageStr: `${c.usedCount || 0} / ${c.usageLimit ? c.usageLimit : '∞'}`,
          _statusStr: c.isActive ? 'Active' : 'Inactive'
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load coupons', err);
        this.isLoading = false;
      }
    });
  }

  openCouponDialog(coupon?: Coupon): void {
    const dialogRef = this.dialog.open(CouponDialogComponent, {
      width: '400px',
      data: coupon ? { ...coupon } : null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.id) {
          this.couponService.updateCoupon(result.id, result).subscribe(() => this.loadCoupons());
        } else {
          this.couponService.createCoupon(result).subscribe(() => this.loadCoupons());
        }
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

// Dialog Component for Create/Edit
@Component({
  selector: 'app-coupon-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Coupon' : 'Create Coupon' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="couponForm" class="flex flex-col gap-4 mt-2">
        <mat-form-field appearance="outline">
          <mat-label>Coupon Code</mat-label>
          <input matInput formControlName="code" placeholder="e.g. SUMMER2026" required>
        </mat-form-field>
        
        <div class="flex gap-4">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Discount Type</mat-label>
            <mat-select formControlName="discountType">
              <mat-option value="PERCENTAGE">Percentage (%)</mat-option>
              <mat-option value="FIXED">Fixed Amount</mat-option>
            </mat-select>
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Value</mat-label>
            <input matInput type="number" formControlName="discountValue" required>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Expiry Date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="expiryDate" required>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Usage Limit</mat-label>
          <input matInput type="number" formControlName="usageLimit" placeholder="Optional">
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="isActive">
            <mat-option [value]="true">Active</mat-option>
            <mat-option [value]="false">Inactive</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="couponForm.invalid" (click)="onSave()">Save</button>
    </mat-dialog-actions>
  `
})
export class CouponDialogComponent {
  couponForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CouponDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Coupon | null
  ) {
    this.couponForm = this.fb.group({
      id: [data?.id],
      code: [data?.code || '', Validators.required],
      discountType: [data?.discountType || 'PERCENTAGE', Validators.required],
      discountValue: [data?.discountValue || '', [Validators.required, Validators.min(0)]],
      expiryDate: [data?.expiryDate || '', Validators.required],
      usageLimit: [data?.usageLimit || null],
      isActive: [data !== null ? data.isActive : true]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.couponForm.valid) {
      this.dialogRef.close(this.couponForm.value);
    }
  }
}
