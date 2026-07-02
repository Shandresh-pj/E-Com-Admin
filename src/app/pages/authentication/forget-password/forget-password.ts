import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { take } from 'rxjs/operators';

import { MaterialModule } from 'src/app/material.module';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
  ],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.scss'
})
export class ForgetPassword implements OnInit, OnDestroy {

  PasswordChange: FormGroup;
  otpSent = false;
  otpVerified = false;
  countdown = 60;
  timerSubscription?: Subscription;
  hideNewPassword = true;
  hideConfirmPassword = true;
  isVerifyingOtp = false;
  isResettingPassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private commonService: CommonService,
    private authService: AuthService,
    private alert: AlertService
  ) {
    const user = this.authService.getUser();

    this.PasswordChange = this.fb.group({
      email: [
        { value: user?.email || '', disabled: !!user?.email },
        [Validators.required, Validators.email]
      ],
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: [passwordMatchValidator]
    });
  }

  ngOnInit(): void { }

  get fp() {
    return this.PasswordChange.controls;
  }

  SendOtp(): void {
    if (this.otpSent) return;

    const emailControl = this.PasswordChange.get('email');
    if (emailControl?.invalid) {
      emailControl.markAsTouched();
      return;
    }

    const payload = { email: emailControl?.value };

    this.commonService.postApi('password/send-otp', payload).subscribe({
      next: () => {
        this.alert.success('OTP sent successfully to your email');
        this.startTimer();
      },
      error: (err) => {
        this.alert.error(
          err?.error?.message || 'Failed to send OTP'
        );
      }
    });
  }

  private startTimer(): void {
    this.otpSent = true;
    this.countdown = 60;

    this.timerSubscription?.unsubscribe();

    this.timerSubscription = interval(1000)
      .pipe(take(60))
      .subscribe({
        next: () => {
          this.countdown--;
          if (this.countdown <= 0) {
            this.otpSent = false;
          }
        }
      });
  }

  VerifyOtp(): void {
    const emailControl = this.PasswordChange.get('email');
    const otpControl = this.PasswordChange.get('otp');

    if (emailControl?.invalid || otpControl?.invalid) {
      emailControl?.markAsTouched();
      otpControl?.markAsTouched();
      return;
    }

    if (this.isVerifyingOtp) return;
    this.isVerifyingOtp = true;

    const payload = {
      email: emailControl?.value,
      otp: otpControl?.value
    };

    this.commonService.postApi('password/verify-otp', payload).subscribe({
      next: () => {
        this.isVerifyingOtp = false;
        this.otpVerified = true;
        this.alert.success('OTP verified successfully. Please enter your new password.');
        this.timerSubscription?.unsubscribe();
      },
      error: (err) => {
        this.isVerifyingOtp = false;
        this.alert.error(
          err?.error?.message || 'Invalid or expired OTP'
        );
      }
    });
  }

  onsubmit(): void {
    // Only check password and confirmPassword validity
    const passwordControl = this.PasswordChange.get('password');
    const confirmPasswordControl = this.PasswordChange.get('confirmPassword');

    if (passwordControl?.invalid || confirmPasswordControl?.invalid || this.PasswordChange.hasError('passwordMismatch')) {
      passwordControl?.markAsTouched();
      confirmPasswordControl?.markAsTouched();
      return;
    }

    if (this.isResettingPassword) return;
    this.isResettingPassword = true;

    const rawValues = this.PasswordChange.getRawValue();
    const payload = {
      email: rawValues.email,
      newPassword: rawValues.password,
      confirmPassword: rawValues.confirmPassword
    };

    this.commonService.postApi('password/reset-password', payload).subscribe({
      next: () => {
        this.isResettingPassword = false;
        this.alert.success('Password reset successfully');
        this.router.navigate(['/authentication/login']);
      },
      error: (err) => {
        this.isResettingPassword = false;
        this.alert.error(
          err?.error?.message || 'Password update failed'
        );
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/authentication/login']);
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }
}
