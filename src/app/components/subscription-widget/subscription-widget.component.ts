import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';

import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

@Component({
  selector: 'app-subscription-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, AppTranslatePipe],
  templateUrl: './subscription-widget.component.html',
  styleUrls: ['./subscription-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionWidgetComponent implements OnInit, OnDestroy {
  subscription: any = null;
  loading = true;
  daysRemaining    = 0;
  hoursRemaining   = 0;
  minutesRemaining = 0;
  secondsRemaining = 0;

  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private subscriptionService: SubscriptionService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchSubscription();

    // ── Listen for local Subject updates AND real-time socket events ───────
    merge(
      this.subscriptionService.subscriptionUpdated$,
      this.socketService.on('subscription.activated'),
      this.socketService.on('subscription.trial.started')
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchSubscription();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  fetchSubscription(): void {
    this.loading = true;
    this.subscriptionService.getCurrentSubscription().subscribe({
      next: (sub: any) => {
        if (sub) {
          this.subscription = sub;
          this.calculateRemainingTime();

          if (this.countdownInterval) clearInterval(this.countdownInterval);
          // Tick every second to display real-time live countdown with seconds
          this.countdownInterval = setInterval(() => this.calculateRemainingTime(), 1000);
        } else {
          this.subscription = null;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.subscription = null;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  calculateRemainingTime(): void {
    if (!this.subscription || (!this.subscription.trial_end && !this.subscription.end_date)) return;

    const targetDate = this.subscription.status === 'trialing' && this.subscription.trial_end
      ? new Date(this.subscription.trial_end)
      : new Date(this.subscription.end_date);

    const now  = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff > 0) {
      this.daysRemaining    = Math.floor(diff / (1000 * 60 * 60 * 24));
      this.hoursRemaining   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      this.secondsRemaining = Math.floor((diff % (1000 * 60)) / 1000);
    } else {
      this.daysRemaining = this.hoursRemaining = this.minutesRemaining = this.secondsRemaining = 0;
      if (this.subscription.status !== 'expired' && this.subscription.status !== 'canceled') {
        this.subscription = { ...this.subscription, status: 'expired' };
      }
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    }
    this.cdr.markForCheck();
  }

  /** Scroll smoothly to subscription plans section on dashboard */
  scrollToPlans(): void {
    const targetEl = document.getElementById('subscription-plans-section') || document.querySelector('app-subscription-plans');
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      this.router.navigate(['/subscription-plans']);
    }
  }

  get statusClass(): string {
    const s = this.subscription?.status ?? '';
    if (s === 'trialing') return 'status-trial';
    if (s === 'active')   return 'status-active';
    if (s === 'expired')  return 'status-expired';
    if (s === 'canceled') return 'status-cancelled';
    return 'status-inactive';
  }

  get expiryDateFormatted(): string {
    const date = this.subscription?.status === 'trialing'
      ? this.subscription?.trial_end
      : this.subscription?.end_date;
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}
