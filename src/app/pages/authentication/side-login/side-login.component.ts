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
import { SessionService } from 'src/app/Securities/Services/session.service';

@Component({
  selector: 'app-side-login',
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './side-login.component.html',
  styleUrls: ['./side-login.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppSideLoginComponent implements OnInit, OnDestroy {

  LoginForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService,
    private alert: AlertService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private cdr: ChangeDetectorRef
  ) {
    this.LoginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    // Ensure clean session & local storage every time the user visits the login page
    this.tokenService.removeToken();
    this.tokenService.removeRefreshToken();
    this.sessionService.clearSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() {
    return this.LoginForm.controls;
  }

  onSubmit(): void {
    if (this.LoginForm.invalid) {
      this.LoginForm.markAllAsTouched();
      this.alert.warning('Please enter a valid email and password.');
      return;
    }

    if (this.isLoading) {
      return;
    }

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
            this.alert.error(res?.message || 'Login failed. Please try again.');
            return;
          }

          this.router.navigate(['/dashboard']).then((success) => {
            if (!success) {
              console.warn('[Login] Navigation to /dashboard was cancelled.');
            }
          }).catch((err) => {
            console.error('[Login] Navigation error:', err);
            this.alert.error('Navigation error. Please try again.');
          });
        },
        error: (err) => {
          console.error('[Login] Error:', err);
          switch (err.status) {
            case 0:
              this.alert.error('Unable to connect to the server. Check your network.');
              break;
            case 400:
              this.alert.error(err.error?.message || 'Invalid request.');
              break;
            case 401:
              this.alert.error(err.error?.message || 'Invalid email or password.');
              break;
            case 403:
              this.alert.error(err.error?.message || 'Access denied. Contact an administrator.');
              break;
            case 404:
              this.alert.error('Service not found. Contact support.');
              break;
            case 429:
              this.alert.error('Too many attempts. Please try again later.');
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
}
