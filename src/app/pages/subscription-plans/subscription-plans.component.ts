import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SubscriptionService, SubscriptionPlan } from '../../services/subscription.service';
import { SubscriptionCheckoutModalComponent } from '../../components/subscription-checkout-modal/subscription-checkout-modal.component';
import { MaterialModule } from '../../material.module';

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionPlansComponent implements OnInit, OnDestroy {
  plans: SubscriptionPlan[] = [];
  billingCycle: 'Monthly' | 'Yearly' = 'Yearly';
  private destroy$ = new Subject<void>();

  constructor(
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscriptionService.getPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          this.plans = plans;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading plans', err);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setBillingCycle(cycle: 'Monthly' | 'Yearly') {
    this.billingCycle = cycle;
    this.cdr.markForCheck();
  }

  openSubscriptionModal(plan: SubscriptionPlan, mode: 'trial' | 'pay') {
    this.dialog.open(SubscriptionCheckoutModalComponent, {
      width: '580px',
      maxWidth: '95vw',
      panelClass: 'cyber-modal-overlay',
      data: {
        plan,
        billingCycle: this.billingCycle,
        initialMode: mode
      }
    });
  }
}
