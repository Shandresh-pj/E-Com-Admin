import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword');

  if (!confirmPassword) return null;

  if (newPassword && confirmPassword.value && newPassword !== confirmPassword.value) {
    confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
    return { passwordMismatch: true };
  } else if (confirmPassword.errors?.['passwordMismatch']) {
    delete confirmPassword.errors['passwordMismatch'];
    if (Object.keys(confirmPassword.errors).length === 0) {
      confirmPassword.setErrors(null);
    }
  }
  return null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    AppTranslatePipe
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  ChangePasswordForm: FormGroup;
  hideCurrent = true;
  hideNew = true;
  hideConfirm = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService
  ) {
    this.ChangePasswordForm = fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: [passwordMatchValidator]
    });
  }

  onSubmit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const payload = {
      currentPassword: form.value.currentPassword,
      current_password: form.value.currentPassword,
      oldPassword: form.value.currentPassword,
      newPassword: form.value.newPassword,
      new_password: form.value.newPassword,
      confirmPassword: form.value.confirmPassword
    };

    this.isLoading = true;
    this.commonService.postApi(`password/change-password`, payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.alert.success("Password Changed Successfully");
        form.reset();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.alert.error(err?.error?.message || "Failed to change password");
      }
    });
  }

  onCancel() {
    this.ChangePasswordForm.reset();
  }
}
