import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { FormGroup, Validators, FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { TokenService } from 'src/app/Securities/Services/token.service';

// SEC-10: Frontend lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000; // 30 seconds

@Component({
  selector: 'app-side-login',
  standalone: true,                  // BUG-1: standalone was missing
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './side-login.component.html',
  styleUrls: ['./side-login.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppSideLoginComponent implements OnInit, OnDestroy {

  LoginForm: FormGroup;
  isLoading    = false;
  hidePassword = true;

  // SEC-10: Failed attempt tracking (public so template can reference MAX_FAILED_ATTEMPTS)
  readonly MAX_FAILED_ATTEMPTS = MAX_FAILED_ATTEMPTS;
  failedAttempts  = 0;
  isLockedOut     = false;
  lockoutSecondsRemaining = 0;

  private lockoutTimer: ReturnType<typeof setInterval> | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private router     : Router,
    private fb         : FormBuilder,
    private authService: AuthService,
    private alert      : AlertService,
    private tokenService: TokenService,
    private cdr        : ChangeDetectorRef
  ) {
    this.LoginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    // SEC-5: Removed unconditional session clear — active sessions must not be wiped
    // when a user lands on this page (e.g., via browser back from a post-logout redirect).
    // NonAuthGuard already redirects authenticated users away from /authentication/*.
    // If the token is expired, AuthGuard will handle redirect; we don't need to clear here.
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearLockoutTimer();
  }

  get f() {
    return this.LoginForm.controls;
  }

  onSubmit(): void {
    // SEC-10: Block submission if locked out
    if (this.isLockedOut) {
      this.alert.warning(`Too many failed attempts. Please wait ${this.lockoutSecondsRemaining}s before trying again.`);
      return;
    }

    if (this.LoginForm.invalid) {
      this.LoginForm.markAllAsTouched();
      this.alert.warning('Please enter a valid email and password.');
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.login(this.LoginForm.value)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          if (!res || !res.token) {
            this.handleFailedAttempt();
            this.alert.error(res?.message || 'Login failed. Please try again.');
            return;
          }

          // Successful login — reset attempt counter
          this.failedAttempts = 0;

          // Refresh permissions from DB immediately after login so isSuperAdmin,
          // userType, permissions and menus are populated before dashboard renders.
          // Navigation proceeds regardless of whether the refresh succeeds.
          this.authService.refreshPermissions().subscribe({
            error: () => {} // Non-blocking — silently ignore errors
          });

          this.router.navigate(['/dashboard']).then(success => {
            if (!success) {
              console.warn('[Login] Navigation to /dashboard was cancelled.');
            }
          }).catch(err => {
            console.error('[Login] Navigation error:', err);
            this.alert.error('Navigation error. Please try again.');
          });
        },
        error: (err: any) => {
          this.handleFailedAttempt();

          switch (err.status) {
            case 0:
              this.alert.error('Unable to connect to the server. Check your network connection.');
              break;
            case 400:
              this.alert.error(err.error?.message || 'Invalid request format.');
              break;
            case 401:
              this.alert.error(err.error?.message || 'Invalid email or password.');
              break;
            case 403:
              this.alert.error(err.error?.message || 'Access denied. Contact your administrator.');
              break;
            case 404:
              this.alert.error('Authentication service not found. Contact support.');
              break;
            case 429:
              this.alert.error('Too many login attempts. Please wait before retrying.');
              // Server-reported rate limit — trigger lockout immediately
              this.triggerLockout();
              break;
            case 500:
              this.alert.error('Internal server error. Please try again later.');
              break;
            default:
              this.alert.error(err.error?.message || 'Something went wrong. Please try again.');
          }
        }
      });
  }

  // ─── SEC-10: Lockout Logic ────────────────────────────────────────────────

  private handleFailedAttempt(): void {
    this.failedAttempts++;
    if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      this.triggerLockout();
    }
  }

  private triggerLockout(): void {
    this.isLockedOut = true;
    this.lockoutSecondsRemaining = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    this.LoginForm.disable();

    this.lockoutTimer = setInterval(() => {
      this.lockoutSecondsRemaining--;
      this.cdr.detectChanges();

      if (this.lockoutSecondsRemaining <= 0) {
        this.clearLockout();
      }
    }, 1000);
  }

  private clearLockout(): void {
    this.isLockedOut    = false;
    this.failedAttempts = 0;
    this.lockoutSecondsRemaining = 0;
    this.LoginForm.enable();
    this.clearLockoutTimer();
    this.cdr.detectChanges();
  }

  private clearLockoutTimer(): void {
    if (this.lockoutTimer !== null) {
      clearInterval(this.lockoutTimer);
      this.lockoutTimer = null;
    }
  }
}
