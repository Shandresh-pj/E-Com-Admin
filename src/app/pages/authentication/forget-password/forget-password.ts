import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MaterialModule } from 'src/app/material.module';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';

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
export class ForgetPassword implements OnInit {

  PasswordChange: FormGroup;
  isSending = false;
  isSuccess = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private commonService: CommonService,
    private alert: AlertService
  ) {
    this.PasswordChange = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void { }

  get fp() {
    return this.PasswordChange.controls;
  }

  submitRequest(): void {
    if (this.PasswordChange.invalid) {
      this.PasswordChange.markAllAsTouched();
      return;
    }

    this.isSending = true;
    const payload = { email: this.fp['email'].value };

    this.commonService.postApi('password/forgot-password', payload).subscribe({
      next: (res: any) => {
        this.isSending = false;
        this.isSuccess = true;
        this.alert.success(res.message || 'Password reset link sent to your email.');
      },
      error: (err: any) => {
        this.isSending = false;
        this.alert.error(err?.error?.message || 'Failed to send reset link.');
      }
    });
  }
}
