import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { take } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.scss'
})
export class ForgetPassword implements OnInit, OnDestroy {

  PasswordChange: FormGroup;
  otpSent = false;
  countdown = 60;
  timerSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private authService: AuthService,
    private alert: AlertService
  ) {
    const user = this.authService.getUser();
    console.log("aaaa-1.1",user)
    

    this.PasswordChange = this.fb.group({
      email: [
        { value: user?.email || '', disabled: true },
        [Validators.required, Validators.email]
      ],
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void { }

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

  onsubmit(): void {
    if (this.PasswordChange.invalid) {
      this.PasswordChange.markAllAsTouched();
      return;
    }

    const payload = this.PasswordChange.getRawValue();

    this.commonService.postApi('auth/change-password', payload).subscribe({
      next: () => {
        this.alert.success('Password changed successfully');
        this.PasswordChange.reset();
        this.otpSent = false;
      },
      error: (err) => {
        this.alert.error(
          err?.error?.message || 'Password update failed'
        );
      }
    });
  }

  cancel(): void {
    // Add your navigation logic here (e.g. router.navigate)
    this.PasswordChange.reset();
    this.otpSent = false;
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }
}