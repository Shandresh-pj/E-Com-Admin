import { Component, OnInit } from '@angular/core';

import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environment/environment';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterModule, MatButtonModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {

  token = '';
  isVerifying = true;
  isSuccess = false;
  autoApproved = false;
  message = '';
  isAuthFlow = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    const paramToken = this.route.snapshot.paramMap.get('token');
    const queryToken = this.route.snapshot.queryParamMap.get('token');
    
    this.token = paramToken || queryToken || '';
    this.isAuthFlow = !!paramToken;

    if (!this.token) {
      this.isVerifying = false;
      this.isSuccess = false;
      this.message = 'No verification token was found in the URL. Please check your registration email.';
      return;
    }

    this.verify();
  }

  verify() {
    if (this.isAuthFlow) {
      this.http.get(`${environment.apiUrl}/auth/verify/${this.token}`).subscribe({
        next: (res: any) => {
          this.isVerifying = false;
          this.isSuccess = true;
          this.message = res.message || 'Email verified successfully!';
        },
        error: (err: any) => {
          this.isVerifying = false;
          this.isSuccess = false;
          this.message = err.error?.message || 'Email verification failed. The link may have expired or already been verified.';
        }
      });
    } else {
      this.http.post(`${environment.apiUrl}/contact/verify-email`, { token: this.token }).subscribe({
        next: (res: any) => {
          this.isVerifying = false;
          this.isSuccess = true;
          this.autoApproved = res.autoApproved;
          this.message = res.message;
        },
        error: (err: any) => {
          this.isVerifying = false;
          this.isSuccess = false;
          this.message = err.error?.message || 'Email verification failed. The link may have expired or already been verified.';
        }
      });
    }
  }
}
