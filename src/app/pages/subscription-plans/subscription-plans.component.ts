import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { SubscriptionService, SubscriptionPlan } from '../../services/subscription.service';
import { SubscriptionCheckoutModalComponent, SubscriptionModalData } from '../../components/subscription-checkout-modal/subscription-checkout-modal.component';
import { MaterialModule } from '../../material.module';

import { Input } from '@angular/core';

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionPlansComponent implements OnInit, OnDestroy {
  @Input() isPublicHome = false;

  plans: SubscriptionPlan[] = [];
  billingCycle: 'Monthly' | 'Yearly' = 'Yearly';
  loading = true;
  currentSubscription: any = null;
  hasActiveTrialOrSub = false;

  private destroy$ = new Subject<void>();

  constructor(
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();

    // Listen to real-time subscription updates (e.g. after Razorpay payment or trial activation)
    this.subscriptionService.subscriptionUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadData();
      });
  }

  loadData(): void {
    this.loading = true;
    
    // Fetch active/trialing subscription status
    this.subscriptionService.getCurrentSubscription()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sub) => {
          this.currentSubscription = sub;
          if (!this.isPublicHome && sub) {
            this.hasActiveTrialOrSub = sub.status === 'trialing' || sub.status === 'active' || !!sub.trial_end;
          } else {
            this.hasActiveTrialOrSub = false;
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.currentSubscription = null;
          this.hasActiveTrialOrSub = false;
          this.cdr.markForCheck();
        }
      });

    // Fetch plans list
    this.subscriptionService.getPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          this.plans = plans;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setBillingCycle(cycle: 'Monthly' | 'Yearly'): void {
    this.billingCycle = cycle;
    this.cdr.markForCheck();
  }

  /**
   * Opens the premium checkout modal for Free Trial or Pay via Razorpay.
   * mode='trial'  → initiates 14-day free trial flow
   * mode='pay'    → opens Razorpay checkout for the selected plan
   */
  openSubscriptionModal(plan: SubscriptionPlan, mode: 'trial' | 'pay'): void {
    const data: SubscriptionModalData = {
      plan,
      billingCycle: this.billingCycle,
      initialMode:  this.hasActiveTrialOrSub ? 'pay' : mode,
      hasActiveTrialOrSub: this.hasActiveTrialOrSub
    };
    this.dialog.open(SubscriptionCheckoutModalComponent, {
      data,
      width:     '520px',
      maxWidth:  '95vw',
      maxHeight: '90vh',
      panelClass: 'checkout-dialog-panel',
      autoFocus: true
    });
  }
}
