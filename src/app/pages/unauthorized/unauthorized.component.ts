import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 60vh;">
      <h1 class="mat-headline-3 text-center mb-3">403 - Access Denied</h1>
      <p class="mat-body-1 text-center mb-4">You do not have permission to view this page.</p>
      <button mat-flat-button color="primary" (click)="goToDashboard()">Go to Dashboard</button>
    </div>
  `,
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
