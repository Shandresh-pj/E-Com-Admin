import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { Router, RouterModule } from '@angular/router';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { CoreService } from 'src/app/services/core.service';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';

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
    ThemeToggleComponent
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
    public coreService: CoreService
  ) {}

  // ── Static notifications ────────────────────────────────────────────────
  notifications: any[] = [
    {
      id: 1,
      icon: 'info-circle',
      title: 'System updated successfully',
      time: 'Just now',
      color: 'primary',
      unread: true,
      isPwdReminder: false
    },
    {
      id: 2,
      icon: 'shopping-cart',
      title: 'New Order #1024 placed',
      time: '5 mins ago',
      color: 'success',
      unread: true,
      isPwdReminder: false
    },
    {
      id: 3,
      icon: 'alert-triangle',
      title: 'High CPU load detected',
      time: '1 hour ago',
      color: 'warning',
      unread: false,
      isPwdReminder: false
    },
    {
      id: 4,
      icon: 'message',
      title: 'New message from Sarah',
      time: '2 hours ago',
      color: 'accent',
      unread: false,
      isPwdReminder: false
    }
  ];

  // ── Password Reminder countdown ─────────────────────────────────────────
  showPwdReminder = false;
  countdownDisplay = '';              // e.g. "23:45:10"
  countdownUrgent  = false;          // turns red when < 1 hour remains
  private countdownInterval: any;
  private firstLoginTs = 0;

  get unreadCount(): number {
    return this.notifications.filter(n => n.unread).length
      + (this.showPwdReminder ? 1 : 0);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initPasswordReminder();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
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
    this.router.navigate(['/components/change-password']);
  }

  // ── Existing methods ────────────────────────────────────────────────────
  get unreadNotifications() {
    return this.notifications.filter(n => n.unread);
  }

  clearAll() {
    this.notifications = this.notifications.map(n => ({ ...n, unread: false }));
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

  ProfilePage() {
    this.router.navigate(['/components/profile']);
  }
}