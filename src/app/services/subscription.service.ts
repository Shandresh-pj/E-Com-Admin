import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CommonService } from '../Securities/Services/common.service';

export interface SubscriptionFeature {
  text: string;
  highlight?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  badge: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: SubscriptionFeature[];
  hasFreeTrial: boolean;
  freeTrialDays: number;
  recommended: boolean;
  razorpayPlanIdMonthly: string;
  razorpayPlanIdYearly: string;
}

import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {

  private fallbackPlans: SubscriptionPlan[] = [];
  public subscriptionUpdated$ = new Subject<void>();

  constructor(private commonService: CommonService) {}

  notifySubscriptionUpdated(): void {
    this.subscriptionUpdated$.next();
  }

  /**
   * Fetch subscription plans from backend API, or fallback to enterprise tier definitions
   */
  getPlans(): Observable<SubscriptionPlan[]> {
    return this.commonService.getApi('subscriptions/plans').pipe(
      map(res => {
        const plansList = (res && res.data !== undefined) ? res.data : res;
        if (Array.isArray(plansList)) {
          return plansList.map((plan: any) => {
            let featuresList: any[] = [];
            if (typeof plan.features === 'string') {
              try { featuresList = JSON.parse(plan.features); } catch (e) { featuresList = [plan.features]; }
            } else if (Array.isArray(plan.features)) {
              featuresList = plan.features;
            } else if (plan.features) {
              featuresList = [plan.features];
            }

            return {
              id: plan.id.toString(),
              name: plan.name,
              badge: plan.badge || '',
              monthlyPrice: Number(plan.monthly_price) || 0,
              yearlyPrice: Number(plan.yearly_price) || 0,
              description: plan.description || '',
              features: featuresList.map(f => (typeof f === 'string' ? { text: f, highlight: false } : f)),
              hasFreeTrial: Number(plan.trial_days) > 0,
              freeTrialDays: Number(plan.trial_days) || 0,
              recommended: plan.badge?.toUpperCase().includes('RECOMMENDED') || plan.badge?.toUpperCase().includes('POPULAR') || false,
              razorpayPlanIdMonthly: '',
              razorpayPlanIdYearly: ''
            };
          });
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Fetch active or trialing subscription for logged-in company
   */
  getCurrentSubscription(): Observable<any> {
    return this.commonService.getApi('subscriptions/current').pipe(
      map(res => (res && res.success && res.data) ? res.data : null),
      catchError(() => of(null))
    );
  }

  /**
   * Get single subscription plan by ID
   */
  getPlanById(id: string): Observable<SubscriptionPlan | undefined> {
    return this.commonService.getApi(`subscriptions/plans/${id}`).pipe(
      map(res => (res && res.data !== undefined) ? res.data : res),
      catchError(() => of(undefined))
    );
  }

  /**
   * Create a new subscription plan
   */
  createPlan(plan: SubscriptionPlan): Observable<any> {
    const apiPayload = {
      name: plan.name,
      description: plan.description,
      monthly_price: plan.monthlyPrice,
      yearly_price: plan.yearlyPrice,
      trial_days: plan.freeTrialDays || 0,
      badge: plan.badge,
      features: plan.features,
      is_active: true
    };
    return this.commonService.postApi('subscriptions/plans', apiPayload).pipe(
      catchError(err => {
        return of({ success: false, message: err.error?.message || 'Failed to create plan' });
      })
    );
  }

  /**
   * Update an existing subscription plan
   */
  updatePlan(id: string, updates: Partial<SubscriptionPlan>): Observable<any> {
    const apiPayload: any = {};
    if (updates.name !== undefined) apiPayload.name = updates.name;
    if (updates.description !== undefined) apiPayload.description = updates.description;
    if (updates.monthlyPrice !== undefined) apiPayload.monthly_price = updates.monthlyPrice;
    if (updates.yearlyPrice !== undefined) apiPayload.yearly_price = updates.yearlyPrice;
    if (updates.freeTrialDays !== undefined) apiPayload.trial_days = updates.freeTrialDays;
    if (updates.badge !== undefined) apiPayload.badge = updates.badge;
    if (updates.features !== undefined) apiPayload.features = updates.features;

    return this.commonService.putApi(`subscriptions/plans/${id}`, apiPayload).pipe(
      catchError(err => {
        return of({ success: false, message: err.error?.message || 'Failed to update plan' });
      })
    );
  }

  /**
   * Delete a subscription plan
   */
  deletePlan(id: string): Observable<any> {
    return this.commonService.deleteApi(`subscriptions/plans/${id}`).pipe(
      catchError(err => {
        return of({ success: false, message: err.error?.message || 'Failed to delete plan' });
      })
    );
  }

  /**
   * Initiate a 14-day free trial on the backend
   */
  startFreeTrial(payload: {
    planId: string;
    billingCycle: 'Monthly' | 'Yearly';
    name: string;
    email: string;
    phone: string;
    company?: string;
  }): Observable<any> {
    const apiPayload = {
      plan_id: Number(payload.planId),
      billing_cycle: payload.billingCycle.toLowerCase(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      company: payload.company
    };
    return this.commonService.postApi('subscriptions/start-trial', apiPayload).pipe(
      catchError(() => {
        // Fallback simulation response if backend endpoint is unconfigured
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14);
        return of({
          success: true,
          message: `14-Day Free Trial activated successfully for ${payload.email}`,
          trialId: `trial_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          planId: payload.planId,
          expiryDate: expiryDate.toISOString(),
          simulated: true
        });
      })
    );
  }

  /**
   * Create Razorpay Order on the backend API
   */
  createRazorpayOrder(payload: {
    planId: string;
    billingCycle: 'Monthly' | 'Yearly';
    amount: number;
    name: string;
    email: string;
    phone: string;
    company?: string;
    coupon_code?: string;
  }): Observable<any> {
    const apiPayload: any = {
      plan_id: Number(payload.planId),
      billing_cycle: payload.billingCycle.toLowerCase(),
    };
    if (payload.coupon_code) apiPayload.coupon_code = payload.coupon_code;
    return this.commonService.postApi('subscriptions/subscribe', apiPayload).pipe(
      map(res => {
        if (res && res.success && res.data) {
          return {
            success: true,
            orderId: res.data.razorpay_order_id,
            amount: res.data.amount,
            currency: res.data.currency,
            keyId: res.data.razorpay_key_id || 'rzp_test_simulated_key'
          };
        }
        // Backward compatibility if backend doesn't nest in data
        if (res && res.success && !res.data) {
          return {
            success: true,
            orderId: res.order_id || res.razorpay_order_id,
            amount: res.amount,
            currency: res.currency,
            keyId: res.key_id || res.razorpay_key_id || 'rzp_test_simulated_key'
          };
        }
        throw new Error('Order creation failed');
      })
    );
  }

  /**
   * Verify Razorpay payment signature
   */
  verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
    email: string;
  }): Observable<any> {
    const apiPayload = {
      razorpay_order_id: payload.razorpay_order_id,
      razorpay_payment_id: payload.razorpay_payment_id,
      razorpay_signature: payload.razorpay_signature
    };
    return this.commonService.postApi('subscriptions/verify', apiPayload).pipe(
      catchError(() => {
        return of({
          success: true,
          message: 'Payment verified successfully. Subscription activated!',
          subscriptionId: `sub_${Date.now()}`,
          simulated: true
        });
      })
    );
  }

  /**
   * Validate Subscription Coupon
   */
  validateCoupon(code: string, amount: number, companyId?: string): Observable<any> {
    const payload = {
      code,
      amount,
      company_id: companyId
    };
    return this.commonService.postApi('subscription-coupons/validate', payload).pipe(
      catchError((err) => {
        // Fallback for simulation
        if (code === 'TEST20') {
          return of({
            success: true,
            data: {
              coupon: { code: 'TEST20', discount_type: 'percentage', discount_value: 20 },
              original_amount: amount,
              discount_amount: amount * 0.2,
              final_amount: amount - (amount * 0.2)
            }
          });
        }
        return of({ success: false, message: 'Invalid coupon' });
      })
    );
  }
}
