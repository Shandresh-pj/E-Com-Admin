import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';

interface Particle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  color: string;
}

@Component({
  selector: 'app-side-login',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, DecimalPipe, CommonModule],
  templateUrl: './side-login.component.html',
})
export class AppSideLoginComponent implements OnInit, OnDestroy {

  LoginForm: FormGroup;
  isLoading  = false;
  hidePassword = true;

  // Animated metric targets
  readonly metricSessions = 1284;
  readonly metricUptime   = 94.8;
  displaySessions = 0;
  displayUptime   = 0;

  // Particle system
  readonly particles: Particle[] = this._buildParticles(28);

  private _raf = 0;
  private _counterTimer: any;

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

  ngOnInit(): void {
    this._startCounters();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this._raf);
    if (this._counterTimer) clearTimeout(this._counterTimer);
  }

  // ── Mouse parallax — aurora blobs follow cursor ──────────────
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    const x = ((e.clientX / window.innerWidth)  - 0.5) * 40;
    const y = ((e.clientY / window.innerHeight) - 0.5) * 28;
    document.documentElement.style.setProperty('--nc-mx', `${x}px`);
    document.documentElement.style.setProperty('--nc-my', `${y}px`);
  }

  // ── Animated counters ────────────────────────────────────────
  private _startCounters(): void {
    this._counterTimer = setTimeout(() => {
      const duration  = 2400;
      const startTime = performance.now();
      const tick = (now: number) => {
        const t    = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        this.displaySessions = Math.floor(ease * this.metricSessions);
        this.displayUptime   = parseFloat((ease * this.metricUptime).toFixed(1));
        if (t < 1) this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }, 700);
  }

  // ── Particle builder ─────────────────────────────────────────
  private _buildParticles(count: number): Particle[] {
    const colors = [
      'rgba(124,92,252,0.9)',
      'rgba(96,165,250,0.85)',
      'rgba(52,211,153,0.75)',
      'rgba(167,139,250,0.8)',
      'rgba(255,255,255,0.55)',
    ];
    return Array.from({ length: count }, (_, i) => ({
      id:       i + 1,
      left:     ((i * 137.508) % 100),
      size:     i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
      duration: 9 + (i % 9) * 1.3,
      delay:    i * 0.38,
      drift:    ((i * 29) % 60) - 30,
      color:    colors[i % colors.length],
    }));
  }

  get f() { return this.LoginForm.controls; }

  onSubmit(): void {
    if (this.LoginForm.invalid) { this.LoginForm.markAllAsTouched(); return; }
    if (this.isLoading) return;
    this.isLoading = true;

    this.authService.login(this.LoginForm.value).subscribe({
      next:     () => { this.router.navigate(['/dashboard']); },
      error:    (err) => {
        this.isLoading = false;
        if (err.status === 401) { this.alert.error(err?.error?.message || 'Invalid email or password'); return; }
        if (err.status === 429) { this.alert.warning('Too many login attempts. Please wait a moment.'); return; }
        this.alert.error(err?.error?.message || 'Something went wrong. Please try again.');
      },
      complete: () => { this.isLoading = false; }
    });
  }
}
