import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { CoreService } from 'src/app/services/core.service';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { NotificationService } from 'src/app/services/notification.service';
import { environment } from 'src/environment/environment';
import { Subscription } from 'rxjs';

import { LanguageSelectorComponent } from './language-selector/language-selector.component';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

const FIRST_LOGIN_KEY  = 'svk_first_login_ts';
const PWD_UPDATED_KEY  = 'svk_pwd_updated';
const COUNTDOWN_SECS   = 24 * 60 * 60; // 24-hour reminder window

@Component({
  selector: 'app-header',
  imports: [
    RouterModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
    FormsModule,
    ThemeToggleComponent,
    LanguageSelectorComponent,
    AppTranslatePipe
  ],
  templateUrl: './header.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();

  constructor(
    private router: Router,
    private commonService: CommonService,
    private authService: AuthService,
    private alert: AlertService,
    public coreService: CoreService,
    private socketService: SocketService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  // ── Real notifications ────────────────────────────────────────────────
  notifications: any[] = [];
  notifTab: string = 'all';
  private socketSubscription: Subscription = Subscription.EMPTY;

  // ── Password Reminder countdown ─────────────────────────────────────────
  showPwdReminder = false;
  countdownDisplay = '';              // e.g. "23:45:10"
  countdownUrgent  = false;          // turns red when < 1 hour remains
  private countdownInterval: any;
  private firstLoginTs = 0;

  get unreadCount(): number {
    return this.notifications.filter(n => !n.is_read).length
      + (this.showPwdReminder ? 1 : 0);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initPasswordReminder();
    this.fetchNotifications();

    this.socketService.connect();
    this.socketSubscription = this.socketService.on('new-notification').subscribe((notif: any) => {
      this.notifications.unshift(this.formatNotification(notif)); // Add to top
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }

  fetchNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (res: any) => {
        this.notifications = (res?.data || []).map((n: any) => this.formatNotification(n));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
      }
    });
  }

  formatNotification(notif: any): any {
    let icon = 'info-circle';
    let color = 'primary';
    
    switch (notif.type) {
      case 'PRODUCT_ADDED':
        icon = 'box'; color = 'success'; break;
      case 'PASSWORD_CHANGE':
        icon = 'lock'; color = 'warning'; break;
      case 'SUBSCRIPTION_EXPIRED':
        icon = 'alert-triangle'; color = 'error'; break;
      case 'PUBLISHED':
        icon = 'check'; color = 'success'; break;
      default:
        icon = 'bell'; color = 'accent'; break;
    }

    return {
      ...notif,
      title: notif.message,
      time: new Date(notif.created_at).toLocaleString(),
      icon,
      color,
      unread: !notif.is_read
    };
  }

  // ── First-login password reminder ──────────────────────────────────────
  private initPasswordReminder(): void {
    // If the user already updated their password, do nothing
    if (localStorage.getItem(PWD_UPDATED_KEY) === 'true') return;

    // Record first-login timestamp (once per browser profile)
    let stored = localStorage.getItem(FIRST_LOGIN_KEY);
    if (!stored) {
      const now = Date.now().toString();
      localStorage.setItem(FIRST_LOGIN_KEY, now);
      stored = now;
    }

    this.firstLoginTs = parseInt(stored, 10);
    this.showPwdReminder = true;
    this.startCountdown();
  }

  private startCountdown(): void {
    this.tick();
    this.countdownInterval = setInterval(() => this.tick(), 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private tick(): void {
    const elapsed  = Math.floor((Date.now() - this.firstLoginTs) / 1000);
    const remaining = Math.max(COUNTDOWN_SECS - elapsed, 0);

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    this.countdownDisplay = `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
    this.countdownUrgent  = remaining < 3600; // last hour → red

    if (remaining === 0) {
      this.stopCountdown();
      this.countdownDisplay = '00:00:00';
    }
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  /** Call from "Update Now" button or after successful password change */
  markPasswordUpdated(): void {
    localStorage.setItem(PWD_UPDATED_KEY, 'true');
    localStorage.removeItem(FIRST_LOGIN_KEY);
    this.showPwdReminder = false;
    this.stopCountdown();
    this.alert.success('Password updated! Keep your account secure.', 'All Set 🎉');
  }

  navigateToChangePassword(): void {
    this.router.navigate(['/change-password']);
  }

  // ── Existing methods ────────────────────────────────────────────────────
  get unreadNotifications() {
    return this.notifications.filter(n => n.unread);
  }

  clearAll() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({ ...n, unread: false, is_read: true }));
        this.fetchNotifications();
      }
    });
  }

  markAsRead(notif: any) {
    if (!notif.unread) return;
    this.notificationService.markAsRead(notif.id).subscribe({
      next: () => {
        notif.unread = false;
        notif.is_read = true;
      }
    });
  }

  toggleTheme() {
    this.coreService.toggleTheme();
  }

  isDarkTheme(): boolean {
    return this.coreService.themeSignal() === 'dark';
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/authentication/login']);
  }

  get currentUser() {
    return this.authService.getUser();
  }

  get initials(): string {
    const name = this.currentUser?.name || 'Admin';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  ProfilePage() {
    this.router.navigate(['/profile']);
  }

  get avatarUrl(): string | null {
    const user = this.currentUser;
    if (!user) return null;
    const path = user.image || user.profile_image || user.profileImage || user.avatar;
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:image')) {
      return path;
    }
    const baseUrl = environment.socketUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  onAvatarError(): void {
    const user = this.currentUser;
    if (user) {
      user.image = null;
      user.profile_image = null;
      user.profileImage = null;
      user.avatar = null;
    }
  }

  // ── Global Search ────────────────────────────────────────────────────
  globalSearch = '';
  showSearchDrop = false;
  searchResults: { name: string; path: string; icon: string }[] = [];

  private readonly allPages = [
    { name: 'Dashboard', path: '/dashboard', icon: 'layout-grid-add' },
    { name: 'Profile', path: '/profile', icon: 'user' },
    { name: 'Attendance', path: '/attendance', icon: 'calendar-stats' },
    { name: 'Leave Management', path: '/leave', icon: 'calendar-off' },
    { name: 'Payroll', path: '/payroll', icon: 'cash' },
    { name: 'Company Calendar', path: '/calendar', icon: 'calendar-event' },
    { name: 'Document Verification', path: '/employee-documents', icon: 'file-check' },
    { name: 'Workforce Console', path: '/workforce', icon: 'settings' },
    { name: 'Workforce Requests', path: '/workforce-requests', icon: 'file-check' },
    { name: 'Employees', path: '/employees', icon: 'users' },
    { name: 'Approvals', path: '/approvals', icon: 'checkup-list' },
    { name: 'Audit Logs', path: '/audit-logs', icon: 'clipboard-list' },
    { name: 'Roles', path: '/roles', icon: 'shield' },
    { name: 'Role Access', path: '/role-access', icon: 'shield-check' },
    { name: 'Change Password', path: '/change-password', icon: 'lock' },
    { name: 'Notifications', path: '/notifications', icon: 'bell' },
    { name: 'Products', path: '/product', icon: 'box' },
    { name: 'Orders', path: '/orders', icon: 'shopping-cart' },
    { name: 'Invoice Generator', path: '/invoices', icon: 'file-text' },
    { name: 'Billing History', path: '/billing-history', icon: 'receipt' },
    { name: 'Profit & Loss', path: '/profit-loss', icon: 'chart-pie' },
    { name: 'Branch', path: '/branch', icon: 'building' },
    { name: 'Category', path: '/category', icon: 'folder' },
    { name: 'Coupons', path: '/coupons', icon: 'ticket' },
    { name: 'Payments', path: '/payments', icon: 'credit-card' },
    { name: 'Delivery Tracking', path: '/delivery-tracking', icon: 'truck' },
    { name: 'Alerts', path: '/alerts', icon: 'alert-circle' },
  ];

  onGlobalSearch(): void {
    const q = this.globalSearch.trim().toLowerCase();
    if (!q) { this.searchResults = []; return; }
    this.searchResults = this.allPages
      .filter(p => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
      .slice(0, 8);
  }

  hideSearchDrop(): void {
    setTimeout(() => { this.showSearchDrop = false; }, 150);
  }

  clearSearch(): void {
    this.globalSearch = '';
    this.searchResults = [];
    this.showSearchDrop = false;
  }

}
