import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environment/environment';

import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-setup-password',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './setup-password.component.html',
  styleUrls: ['./setup-password.component.scss']
})
export class SetupPasswordComponent implements OnInit {

  setupForm!: FormGroup;
  token = '';
  isLoading = false;
  isSuccess = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'No setup token was found in the URL. Please check your approval email.';
    }

    this.setupForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }
    return null;
  }

  get f() { return this.setupForm.controls; }

  onSubmit() {
    if (this.setupForm.invalid || !this.token) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post(`${environment.apiUrl}/contact/setup-password`, {
      token: this.token,
      password: this.setupForm.value.password
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.isSuccess = true;
        setTimeout(() => {
          this.router.navigate(['/authentication/login']);
        }, 3000);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Password setup failed. Link may have expired or already been used.';
      }
    });
  }
}
