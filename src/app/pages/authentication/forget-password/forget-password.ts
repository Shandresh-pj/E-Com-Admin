import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MaterialModule } from 'src/app/material.module';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MaterialModule,
  ],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.scss'
})
export class ForgetPassword implements OnInit, OnDestroy {

  PasswordChange: FormGroup;
  isSending    = false;
  isSuccess    = false;

  /** Countdown (seconds) before user can resend — starts at 60 */
  resendCountdown = 0;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  /** Email to display in the success state (snapshot on submit) */
  submittedEmail = '';

  constructor(
    private fb     : FormBuilder,
    private router : Router,
    private commonService: CommonService,
    private alert  : AlertService
  ) {
    this.PasswordChange = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.clearTimer();
  }

  /** Convenience getter for template access */
  get fp(): { [key: string]: AbstractControl } {
    return this.PasswordChange.controls;
  }

  /** Whether the resend button is disabled */
  get canResend(): boolean {
    return !this.isSending && this.resendCountdown === 0;
  }

  /** Submit the forgot-password request */
  submitRequest(isResend = false): void {
    if (this.PasswordChange.invalid) {
      this.PasswordChange.markAllAsTouched();
      return;
    }
    if (this.isSending) return;

    this.isSending = true;
    const email   = this.fp['email'].value?.trim();
    const payload = { email };

    this.commonService.postApi('password/forgot-password', payload).subscribe({
      next: (res: any) => {
        this.isSending      = false;
        this.isSuccess      = true;
        this.submittedEmail = email;
        this.startResendCountdown(60);
        const msg = res?.message || 'Password reset link sent to your email.';
        this.alert.success(msg);
      },
      error: (err: any) => {
        this.isSending = false;
        const msg = err?.error?.message || err?.message || 'Failed to send reset link. Please try again.';
        this.alert.error(msg);
      }
    });
  }

  /** Resend the reset link */
  resendLink(): void {
    if (!this.canResend) return;
    this.submitRequest(true);
  }

  /** Try a different email — go back to form */
  tryDifferentEmail(): void {
    this.isSuccess  = false;
    this.clearTimer();
    this.resendCountdown = 0;
    this.PasswordChange.reset();
  }

  /** Start 60-second countdown before allowing resend */
  private startResendCountdown(seconds: number): void {
    this.clearTimer();
    this.resendCountdown = seconds;
    this.countdownTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.resendCountdown = 0;
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}
