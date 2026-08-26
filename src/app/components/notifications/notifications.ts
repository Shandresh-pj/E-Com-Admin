import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';
import { NotificationService } from 'src/app/services/notification.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { Subscription } from 'rxjs';
import { HcNotificationCategory } from 'src/app/models/healthcare.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TablerIconsModule
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications implements OnInit, OnDestroy {
  notifications: any[] = [];
  loading = false;
  selectedCategory: string = 'ALL';
  private socketSub = Subscription.EMPTY;

  readonly categories = [
    { id: 'ALL', label: 'All' },
    { id: 'STOCK', label: 'Stock & Inventory' },
    { id: 'EXPIRY', label: 'Expiry Alerts' },
    { id: 'APPROVAL', label: 'Stock Approvals' },
    { id: 'CLINICAL', label: 'Appointments & Rx' },
    { id: 'SALES', label: 'Sales & Payments' }
  ];

  constructor(
    private notificationService: NotificationService,
    private socketService: SocketService,
    private alert: AlertService,
    public cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadNotifications();

    this.socketSub = this.socketService.on('new-notification').subscribe((notif: any) => {
      this.notifications.unshift(notif);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.socketSub.unsubscribe();
  }

  loadNotifications() {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (res: any) => {
        this.notifications = res?.data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredNotifications(): any[] {
    if (this.selectedCategory === 'ALL') return this.notifications;
    return this.notifications.filter(n => {
      const cat = (n.category || n.type || '').toUpperCase();
      switch (this.selectedCategory) {
        case 'STOCK': return cat.includes('STOCK');
        case 'EXPIRY': return cat.includes('EXPIRY');
        case 'APPROVAL': return cat.includes('APPROVAL');
        case 'CLINICAL': return cat.includes('APPOINTMENT') || cat.includes('PRESCRIPTION');
        case 'SALES': return cat.includes('SALE') || cat.includes('PAYMENT') || cat.includes('INVOICE');
        default: return true;
      }
    });
  }

  markAsRead(item: any) {
    if (item.is_read) return;

    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.is_read = true;
        this.cdr.detectChanges();
      }
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.alert.success("All notifications marked as read");
        this.cdr.detectChanges();
      }
    });
  }

  getIconForCategory(type: string): string {
    const t = (type || '').toUpperCase();
    if (t.includes('EXPIRY')) return 'clock-exclamation';
    if (t.includes('CRITICAL')) return 'alert-octagon';
    if (t.includes('LOW_STOCK') || t.includes('OUT_OF_STOCK')) return 'alert-triangle';
    if (t.includes('APPROVAL')) return 'checkup-list';
    if (t.includes('APPOINTMENT')) return 'calendar-event';
    if (t.includes('PRESCRIPTION')) return 'prescription';
    if (t.includes('SALE') || t.includes('PAYMENT')) return 'receipt-tax';
    return 'bell';
  }

  getBadgeClass(type: string): string {
    const t = (type || '').toUpperCase();
    if (t.includes('CRITICAL') || t.includes('OUT_OF_STOCK') || t.includes('FAILED')) return 'hc-badge--danger';
    if (t.includes('EXPIRY') || t.includes('LOW_STOCK')) return 'hc-badge--warning';
    if (t.includes('APPROVAL')) return 'hc-badge--info';
    if (t.includes('SUCCESS') || t.includes('COMPLETED')) return 'hc-badge--success';
    return 'hc-badge--neutral';
  }
}
