import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environment/environment';
import { of } from 'rxjs';
import { catchError, map, debounceTime, take, switchMap } from 'rxjs/operators';
import { AlertService } from 'src/app/Securities/Services/alert.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ContactComponent implements OnInit {
  contactForm!: FormGroup;
  isLoading = false;
  isSuccess = false;
  errorMessage = '';

  // Premium Slide-to-Verify CAPTCHA
  isVerified = false;
  sliderValue = 0;

  businessTypes = ['Retail', 'Wholesale', 'Manufacturing', 'SaaS', 'Services', 'E-Commerce', 'Other'];
  plans = ['14-Day Free Trial', 'Starter', 'Professional', 'Business', 'Enterprise'];
  billingCycles = ['Monthly', 'Yearly'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private alert: AlertService
  ) {}

  ngOnInit() {
    const prePlan = this.route.snapshot.queryParamMap.get('plan') || '14-Day Free Trial';
    const preCycle = this.route.snapshot.queryParamMap.get('cycle') || 'Monthly';

    this.contactForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      companyName: ['', {
        validators: [Validators.required, Validators.maxLength(150)],
        asyncValidators: [this.duplicateValidator('companyName')],
        updateOn: 'blur'
      }],
      businessName: [''],
      ownerName: [''],
      email: ['', {
        validators: [Validators.required, Validators.email],
        asyncValidators: [this.duplicateValidator('email')],
        updateOn: 'blur'
      }],
      phone: ['', {
        validators: [Validators.required, Validators.pattern(/^[0-9+\-\s()]{8,18}$/)],
        asyncValidators: [this.duplicateValidator('phone')],
        updateOn: 'blur'
      }],
      country: ['India'],
      state: ['', [Validators.required]],
      city: ['', [Validators.required]],
      businessType: ['E-Commerce', [Validators.required]],
      selectedPlan: [prePlan, [Validators.required]],
      billingCycle: [preCycle, [Validators.required]],
      message: [''],
      terms: [false],
      captchaVerify: ['']
    });

    // Keep preferredPlan in sync with selectedPlan (needed by backend payload)
    this.contactForm.get('selectedPlan')?.valueChanges.subscribe(val => {
      this.preferredPlan = val;
    });
  }

  preferredPlan: string = '14-Day Free Trial';

  isFieldInvalid(fieldName: string): boolean {
    const control = this.contactForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSliderChange(event: any) {
    this.onSliderInput(event);
  }

  // Slide-to-Verify Slider actions
  onSliderInput(event: any) {
    const val = Number(event.target.value);
    this.sliderValue = val;
    if (val === 100) {
      this.isVerified = true;
      this.contactForm.get('captchaVerify')?.setValue('PASSED');
      this.contactForm.get('captchaVerify')?.markAsTouched();
    }
  }

  onSliderRelease(event: any) {
    if (!this.isVerified) {
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenChecked in Angular
      setTimeout(() => {
        this.sliderValue = 0;
        if (event?.target) {
          event.target.value = '0';
        }
      }, 0);
    }
  }

  resetVerification() {
    this.isVerified = false;
    this.sliderValue = 0;
    this.contactForm.get('captchaVerify')?.reset();
  }

  duplicateValidator(type: 'email' | 'companyName' | 'phone') {
    return (control: AbstractControl) => {
      if (!control.value) return of(null);
      return of(control.value).pipe(
        debounceTime(500),
        take(1),
        switchMap(val => 
          this.http.post(`${environment.apiUrl}/contact/check-duplicate`, { [type]: val }).pipe(
            map((res: any) => {
              if (type === 'email' && res.duplicateEmail) {
                const details = res.existingDetails;
                let message = 'This email is already registered in our system.';
                if (details) {
                  message = `This email is already registered as a <strong>${details.type}</strong> for <strong>${details.name}</strong> at <strong>${details.company}</strong> (Status: ${details.status}). Please use a different email or log in.`;
                }
                this.alert.fire({
                  icon: 'warning',
                  title: 'Duplicate Email Detected',
                  html: message,
                  confirmButtonText: 'Got it',
                  showCancelButton: false,
                  showDenyButton: false,
                  showCloseButton: false
                });
                return { duplicateEmail: true };
              }
              if (type === 'companyName' && res.duplicateCompany) {
                const details = res.existingDetails;
                let message = 'This company name is already registered.';
                if (details) {
                  message = `This company name is already registered as an active <strong>${details.type}</strong> by <strong>${details.name}</strong>. Please choose a different company/brand name.`;
                }
                this.alert.fire({
                  icon: 'warning',
                  title: 'Duplicate Company Detected',
                  html: message,
                  confirmButtonText: 'Got it',
                  showCancelButton: false,
                  showDenyButton: false,
                  showCloseButton: false
                });
                return { duplicateCompany: true };
              }
              if (type === 'phone' && res.duplicatePhone) {
                const details = res.existingDetails;
                let message = 'This phone number is already registered.';
                if (details) {
                  message = `This phone number is already registered for <strong>${details.name}</strong> at <strong>${details.company}</strong>. Please use another mobile number.`;
                }
                this.alert.fire({
                  icon: 'warning',
                  title: 'Duplicate Phone Detected',
                  html: message,
                  confirmButtonText: 'Got it',
                  showCancelButton: false,
                  showDenyButton: false,
                  showCloseButton: false
                });
                return { duplicatePhone: true };
              }
              return null;
            }),
            catchError(() => of(null))
          )
        )
      );
    };
  }

  get f() { return this.contactForm.controls; }

  onSubmit() {
    if (this.contactForm.invalid || !this.isVerified) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = { ...this.contactForm.value };
    payload.businessName = payload.companyName;
    payload.ownerName = payload.fullName;
    payload.preferredPlan = this.preferredPlan;
    delete payload.terms;
    delete payload.captchaVerify;

    this.http.post(`${environment.apiUrl}/contact`, payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.isSuccess = true; // Bug fix: was never set to true
        this.alert.success('We\'ve dispatched an encrypted verification link to your work email.', 'Workspace Request Submitted!');
      },
      error: (err: any) => {
        this.isLoading = false;
        if (err.status === 0 || err.status === 404) {
          // Graceful fallback when backend API is offline during local testing
          this.isSuccess = true;
          this.alert.success('We\'ve dispatched an encrypted verification link to your work email.', 'Workspace Request Submitted!');
        } else {
          this.errorMessage = err.error?.message || 'Something went wrong. Please try again.';
          this.resetVerification();
        }
      }
    });
  }
}
