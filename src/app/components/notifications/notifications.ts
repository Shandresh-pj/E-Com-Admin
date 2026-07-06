import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from 'src/app/services/notification.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications implements OnInit, OnDestroy {
  notifications: any[] = [];
  loading = false;
  private socketSub = Subscription.EMPTY;

  constructor(
    private notificationService: NotificationService,
    private socketService: SocketService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef
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

  getIconForType(type: string): string {
    switch (type) {
      case 'LOW_STOCK': return 'warning';
      case 'CRITICAL_STOCK': return 'error';
      case 'APPROVAL_REQUEST': return 'assignment_late';
      case 'PUBLISHED': return 'check_circle';
      case 'STOCK_UPDATE': return 'info';
      case 'BRANCH_ALERT': return 'store';
      default: return 'notifications';
    }
  }

  getClassForType(type: string): string {
    switch (type) {
      case 'CRITICAL_STOCK': return 'text-error font-weight-bold';
      case 'LOW_STOCK': return 'text-warning font-weight-bold';
      case 'APPROVAL_REQUEST': return 'text-primary';
      case 'PUBLISHED': return 'text-success';
      default: return 'text-dark';
    }
  }
}
