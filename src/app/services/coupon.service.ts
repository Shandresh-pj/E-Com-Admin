import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  expiryDate: Date | string;
  isActive: boolean;
  usageLimit?: number;
  usedCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  // Mock data to simulate backend database
  private coupons: Coupon[] = [
    {
      id: '1',
      code: 'SUMMER2026',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      expiryDate: new Date('2026-08-31'),
      isActive: true,
      usageLimit: 100,
      usedCount: 45
    },
    {
      id: '2',
      code: 'WELCOME50',
      discountType: 'FIXED',
      discountValue: 50,
      expiryDate: new Date('2026-12-31'),
      isActive: true,
      usageLimit: 500,
      usedCount: 12
    },
    {
      id: '3',
      code: 'VIPACCESS',
      discountType: 'PERCENTAGE',
      discountValue: 30,
      expiryDate: new Date('2026-10-15'),
      isActive: false,
      usageLimit: 50,
      usedCount: 50
    }
  ];

  constructor() { }

  // Get all coupons
  getCoupons(): Observable<any> {
    // Return wrapped in 'data' to simulate common API response structures
    return of({ data: [...this.coupons], status: 200, message: 'Success' }).pipe(delay(500));
  }

  // Get single coupon by ID
  getCouponById(id: string): Observable<any> {
    const coupon = this.coupons.find(c => c.id === id);
    return of({ data: coupon ? { ...coupon } : undefined, status: 200 }).pipe(delay(300));
  }

  // Create new coupon
  createCoupon(couponData: Omit<Coupon, 'id' | 'usedCount'>): Observable<any> {
    const newCoupon: Coupon = {
      ...couponData,
      id: Math.random().toString(36).substring(2, 9),
      usedCount: 0
    };
    this.coupons.push(newCoupon);
    return of({ data: { ...newCoupon }, status: 201, message: 'Created successfully' }).pipe(delay(500));
  }

  // Update existing coupon
  updateCoupon(id: string, updateData: Partial<Coupon>): Observable<any> {
    const index = this.coupons.findIndex(c => c.id === id);
    if (index === -1) {
      return of({ data: null, status: 404, message: 'Not found' }).pipe(delay(300));
    }
    
    this.coupons[index] = { ...this.coupons[index], ...updateData };
    return of({ data: { ...this.coupons[index] }, status: 200, message: 'Updated successfully' }).pipe(delay(500));
  }

  // Delete coupon
  deleteCoupon(id: string): Observable<any> {
    const index = this.coupons.findIndex(c => c.id === id);
    if (index === -1) {
      return of({ data: false, status: 404, message: 'Not found' }).pipe(delay(300));
    }
    
    this.coupons.splice(index, 1);
    return of({ data: true, status: 200, message: 'Deleted successfully' }).pipe(delay(500));
  }
}
