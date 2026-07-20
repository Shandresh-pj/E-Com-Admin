import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environment/environment';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-subscription-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './subscription-widget.component.html',
  styleUrls: ['./subscription-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionWidgetComponent implements OnInit, OnDestroy {
  subscription: any = null;
  loading = true;
  daysRemaining = 0;
  hoursRemaining = 0;
  minutesRemaining = 0;

  /** Hold the interval ref so we can clear it on destroy */
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchSubscription();
  }

  ngOnDestroy(): void {
    // Prevent memory leaks — clear the countdown timer when component is removed
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  fetchSubscription(): void {
    this.loading = true;
    this.http.get(`${environment.apiUrl}/subscriptions/current`).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.subscription = res.data;
          this.calculateRemainingTime();

          // Clear any existing interval before starting a new one
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
          }
          // Update countdown every minute
          this.countdownInterval = setInterval(() => this.calculateRemainingTime(), 60_000);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // Widget gracefully hides itself when no subscription data is available
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

    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff > 0) {
      this.daysRemaining    = Math.floor(diff / (1000 * 60 * 60 * 24));
      this.hoursRemaining   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    } else {
      this.daysRemaining    = 0;
      this.hoursRemaining   = 0;
      this.minutesRemaining = 0;
      // Mark locally as expired if backend hasn't updated yet
      if (this.subscription.status !== 'expired' && this.subscription.status !== 'canceled') {
        this.subscription = { ...this.subscription, status: 'expired' };
      }
      // Stop ticking — no need to keep updating after expiry
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    }
    this.cdr.markForCheck();
  }

  /** Get CSS status class for the badge */
  get statusClass(): string {
    const s = this.subscription?.status ?? '';
    if (s === 'trialing')  return 'status-trial';
    if (s === 'active')    return 'status-active';
    if (s === 'expired')   return 'status-expired';
    if (s === 'canceled')  return 'status-cancelled';
    return 'status-inactive';
  }

  /** Formatted expiry date string */
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
