import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { MaterialModule } from 'src/app/material.module';
import { AlertService } from 'src/app/Securities/Services/alert.service';
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
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {

  resetForm: FormGroup;
  token = '';
  isResetting = false;
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private commonService: CommonService,
    private alert: AlertService
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: [passwordMatchValidator]
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.alert.error('Invalid or missing reset token.');
      this.router.navigate(['/authentication/login']);
    }
  }

  get f() {
    return this.resetForm.controls;
  }

  submitReset(): void {
    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isResetting = true;
    const payload = { 
      token: this.token,
      password: this.f['password'].value 
    };

    this.commonService.postApi('password/reset-password', payload).subscribe({
      next: (res: any) => {
        this.isResetting = false;
        this.alert.success(res.message || 'Password successfully reset! Please login.');
        setTimeout(() => {
          this.router.navigate(['/authentication/login']);
        }, 1500);
      },
      error: (err: any) => {
        this.isResetting = false;
        this.alert.error(err?.error?.message || 'Failed to reset password. Link may be expired.');
      }
    });
  }
}
