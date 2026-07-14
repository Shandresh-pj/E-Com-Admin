import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonService } from '../Securities/Services/common.service';

export interface Coupon {
  id?: number;
  code: string;
  type: 'percent' | 'flat' | 'bogo' | 'free_shipping';
  value?: number;
  buy_x?: number;
  get_y?: number;
  expiry_date?: Date | string | null;
  usage_limit?: number | null;
  usage_count?: number;
  is_active: boolean;
  company_id?: number | null;
  branch_id?: number | null;
  product_ids?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  constructor(private commonService: CommonService) { }

  getCoupons(): Observable<any> {
    return this.commonService.getApi('coupons');
  }

  createCoupon(couponData: any): Observable<any> {
    return this.commonService.postApi('coupons/create', couponData);
  }

  updateCoupon(id: number | string, updateData: any): Observable<any> {
    // The backend doesn't have PUT /coupons/:id yet, but keeping this for future use if added.
    return this.commonService.putApi(`coupons/${id}`, updateData);
  }

  deleteCoupon(id: number | string): Observable<any> {
    return this.commonService.deleteApi(`coupons/${id}`);
  }
}
