import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';

@Component({
  selector: 'app-side-login',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './side-login.component.html',
})
export class AppSideLoginComponent {

  LoginForm: FormGroup;
  isLoading = false;
  hidePassword: boolean = true;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService,
    private alert: AlertService
  ) {
    this.LoginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get f() {
    return this.LoginForm.controls;
  }

  onSubmit(): void {
    if (this.LoginForm.invalid) {
      this.LoginForm.markAllAsTouched();
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;

    this.authService.login(this.LoginForm.value).subscribe({

      next: () => {
        this.router.navigate(['/dashboard']);
      },

      error: (err) => {
        this.isLoading = false;

        if (err.status === 401) {
          this.alert.error(err?.error?.message || 'Invalid email or password');
          return;
        }

        if (err.status === 429) {
          this.alert.warning('Too many login attempts. Please wait.');
          return;
        }

        this.alert.error(err?.error?.message || 'Something went wrong');
      },

      complete: () => {
        this.isLoading = false;
      }

    });
  }
}
