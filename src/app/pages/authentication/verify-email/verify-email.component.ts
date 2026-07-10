import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {

  token = '';
  isVerifying = true;
  isSuccess = false;
  autoApproved = false;
  message = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.isVerifying = false;
      this.isSuccess = false;
      this.message = 'No verification token was found in the URL. Please check your registration email.';
      return;
    }

    this.verify();
  }

  verify() {
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
