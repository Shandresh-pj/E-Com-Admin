import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="denied-root" #root>

  <!-- Animated particle canvas -->
  <canvas class="particle-canvas" #canvas></canvas>

  <!-- Radial scanner sweep -->
  <div class="scanner-wrap">
    <div class="scanner-ring r1"></div>
    <div class="scanner-ring r2"></div>
    <div class="scanner-ring r3"></div>
    <div class="scanner-sweep"></div>
  </div>

  <!-- Noise overlay -->
  <div class="noise"></div>

  <!-- Main card -->
  <div class="card" [class.visible]="cardVisible">

    <!-- Top warning strip -->
    <div class="warning-strip">
      <span class="strip-dot"></span>
      <span class="strip-text">SECURITY ALERT — ACCESS VIOLATION DETECTED</span>
      <span class="strip-dot"></span>
    </div>

    <!-- Card body -->
    <div class="card-body">

      <!-- Left: Text content -->
      <div class="left">

        <!-- Status badge -->
        <div class="status-badge">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#ef4444" stroke-width="1.5"/>
            <path d="M8 4v4M8 10v1" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          HTTP 403 · FORBIDDEN
        </div>

        <!-- Error code -->
        <h1 class="error-number">
          <span class="digit" style="--d:0">4</span><span class="digit" style="--d:1">0</span><span class="digit" style="--d:2">3</span>
        </h1>

        <!-- Headings -->
        <h2 class="title">Access <span class="accent">Denied</span></h2>

        <p class="subtitle">
          You do not have the required permissions to view this resource.
          Your attempt has been logged. Contact your system administrator
          if you believe this is an error.
        </p>

        <!-- Info pills -->
        <div class="pills">
          <div class="pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Insufficient Privileges
          </div>
          <div class="pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Protected Resource
          </div>
          <div class="pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Authorization Required
          </div>
        </div>

        <!-- Action buttons -->
        <div class="actions">
          <button class="btn-primary" (click)="goToDashboard()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </button>
          <button class="btn-secondary" (click)="goBack()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Go Back
          </button>
        </div>

      </div>

      <!-- Right: Lock visual -->
      <div class="right">
        <div class="lock-scene">

          <!-- Orbit rings -->
          <div class="orbit o1"><div class="orbit-dot"></div></div>
          <div class="orbit o2"><div class="orbit-dot"></div></div>
          <div class="orbit o3"><div class="orbit-dot"></div></div>

          <!-- Lock body -->
          <div class="lock-wrap">
            <div class="lock-glow"></div>
            <svg class="lock-svg" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Shackle -->
              <rect class="shackle" x="35" y="10" width="50" height="55" rx="25" ry="25"
                    stroke="url(#sg)" stroke-width="8" fill="none"/>
              <!-- Body -->
              <rect class="body-rect" x="10" y="60" width="100" height="72" rx="12"
                    fill="url(#bg)" stroke="url(#sg2)" stroke-width="1.5"/>
              <!-- Keyhole circle -->
              <circle cx="60" cy="95" r="14" fill="rgba(0,0,0,0.4)" stroke="rgba(239,68,68,0.6)" stroke-width="1.5"/>
              <!-- Keyhole stem -->
              <rect x="55" y="95" width="10" height="20" rx="3" fill="rgba(239,68,68,0.5)"/>
              <!-- Highlight -->
              <rect x="18" y="68" width="40" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>

              <defs>
                <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6366f1"/>
                  <stop offset="100%" stop-color="#ec4899"/>
                </linearGradient>
                <linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="rgba(99,102,241,0.5)"/>
                  <stop offset="100%" stop-color="rgba(236,72,153,0.3)"/>
                </linearGradient>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="rgba(15,15,30,0.9)"/>
                  <stop offset="100%" stop-color="rgba(30,15,40,0.95)"/>
                </linearGradient>
              </defs>
            </svg>

            <!-- Shake indicator dots -->
            <div class="shake-dots">
              <span></span><span></span><span></span>
            </div>
          </div>

          <!-- Error pulse rings -->
          <div class="pulse p1"></div>
          <div class="pulse p2"></div>

          <!-- Floating chips -->
          <div class="chip chip-tl">DENIED</div>
          <div class="chip chip-br">403</div>

        </div>
      </div>

    </div>

    <!-- Bottom animated trace bar -->
    <div class="trace-bar">
      <div class="trace-fill"></div>
    </div>

  </div>

</div>
`,
  styles: [`
:host {
  display: block;
  height: 100%;
}

/* ─── Root ────────────────────────────────────── */
.denied-root {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #03020f;
  overflow: hidden;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

/* ─── Canvas ─────────────────────────────────── */
.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ─── Noise overlay ──────────────────────────── */
.noise {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  pointer-events: none;
}

/* ─── Scanner rings ──────────────────────────── */
.scanner-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.scanner-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(99,102,241,0.08);
  animation: ring-pulse 4s ease-in-out infinite;
}

.r1 { width: 300px; height: 300px; animation-delay: 0s; }
.r2 { width: 500px; height: 500px; animation-delay: 0.8s; }
.r3 { width: 700px; height: 700px; animation-delay: 1.6s; }

.scanner-sweep {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(99,102,241,0.06) 60deg,
    transparent 70deg
  );
  animation: sweep 6s linear infinite;
}

@keyframes sweep { to { transform: rotate(360deg); } }

@keyframes ring-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.15; transform: scale(1.04); }
}

/* ─── Card ───────────────────────────────────── */
.card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1100px;
  border-radius: 24px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 0 0 1px rgba(99,102,241,0.1),
    0 40px 100px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.06);
  overflow: hidden;
  opacity: 0;
  transform: translateY(32px) scale(0.97);
  transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1),
              transform 0.7s cubic-bezier(0.16,1,0.3,1);
}

.card.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* ─── Warning strip ──────────────────────────── */
.warning-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 24px;
  background: rgba(239,68,68,0.08);
  border-bottom: 1px solid rgba(239,68,68,0.15);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(239,68,68,0.8);
  text-transform: uppercase;
}

.strip-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ef4444;
  animation: blink 1.2s ease-in-out infinite;
}

.strip-dot:last-child { animation-delay: 0.6s; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

/* ─── Card body ──────────────────────────────── */
.card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  padding: 48px 52px;
  align-items: center;
}

/* ─── Left section ───────────────────────────── */
.left {
  display: flex;
  flex-direction: column;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-radius: 100px;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.25);
  color: rgba(239,68,68,0.9);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  width: fit-content;
  margin-bottom: 24px;
  animation: fade-up 0.5s 0.3s both;
}

.error-number {
  display: flex;
  gap: 2px;
  line-height: 1;
  margin: 0 0 16px;
}

.digit {
  display: inline-block;
  font-size: clamp(72px, 10vw, 128px);
  font-weight: 900;
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f97316 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: digit-drop 0.6s calc(0.4s + var(--d) * 0.1s) cubic-bezier(0.34,1.56,0.64,1) both;
}

@keyframes digit-drop {
  from { transform: translateY(-24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.title {
  font-size: clamp(26px, 4vw, 42px);
  font-weight: 800;
  color: #fff;
  margin: 0 0 14px;
  animation: fade-up 0.5s 0.55s both;
}

.accent {
  background: linear-gradient(135deg, #6366f1, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 15px;
  line-height: 1.75;
  color: rgba(200,210,240,0.65);
  max-width: 420px;
  margin: 0 0 28px;
  animation: fade-up 0.5s 0.65s both;
}

/* ─── Pills ──────────────────────────────────── */
.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 32px;
  animation: fade-up 0.5s 0.75s both;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 100px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(200,210,240,0.7);
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.pill:hover {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.35);
  color: #a5b4fc;
}

/* ─── Actions ────────────────────────────────── */
.actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  animation: fade-up 0.5s 0.85s both;
}

.btn-primary, .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 14px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 8px 24px rgba(99,102,241,0.35);
}

.btn-primary:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 14px 32px rgba(99,102,241,0.5);
}

.btn-primary:active { transform: scale(0.97); }

.btn-secondary {
  background: rgba(255,255,255,0.06);
  color: rgba(200,210,240,0.85);
  border: 1px solid rgba(255,255,255,0.12);
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.2);
}

.btn-secondary:active { transform: scale(0.97); }

/* ─── Right / Lock ───────────────────────────── */
.right {
  display: flex;
  justify-content: center;
  align-items: center;
}

.lock-scene {
  position: relative;
  width: 280px; height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orbit {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed rgba(255,255,255,0.1);
  animation: spin linear infinite;
}

.orbit-dot {
  position: absolute;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  top: -4px; left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(99,102,241,0.7);
}

.o1 { width: 170px; height: 170px; animation-duration: 8s; }
.o2 { width: 220px; height: 220px; animation-duration: 14s; animation-direction: reverse; }
.o3 { width: 268px; height: 268px; animation-duration: 20s; }

@keyframes spin { to { transform: rotate(360deg); } }

.lock-wrap {
  position: relative;
  z-index: 5;
  animation: lock-float 4s ease-in-out infinite;
}

@keyframes lock-float {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-12px) rotate(1deg); }
}

.lock-glow {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(99,102,241,0.25), transparent 70%);
  animation: glow-pulse 2.5s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}

.lock-svg {
  width: 110px; height: 130px;
  filter: drop-shadow(0 0 20px rgba(99,102,241,0.5));
}

.shackle {
  animation: shackle-jiggle 3s ease-in-out infinite;
  transform-origin: center 35px;
}

@keyframes shackle-jiggle {
  0%, 85%, 100% { transform: rotate(0deg) translateY(0); }
  88% { transform: rotate(-3deg) translateY(-2px); }
  92% { transform: rotate(3deg) translateY(-1px); }
  96% { transform: rotate(-2deg) translateY(-2px); }
}

.shake-dots {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 14px;
}

.shake-dots span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(239,68,68,0.7);
  animation: dot-seq 1.5s 2.5s ease-in-out infinite;
}

.shake-dots span:nth-child(2) { animation-delay: 2.65s; background: rgba(245,158,11,0.7); }
.shake-dots span:nth-child(3) { animation-delay: 2.8s; background: rgba(99,102,241,0.7); }

@keyframes dot-seq {
  0%, 60%, 100% { transform: scale(1); opacity: 0.7; }
  30% { transform: scale(1.5); opacity: 1; }
}

.pulse {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(239,68,68,0.4);
  animation: pulse-out 2.5s ease-out infinite;
}

.p1 { width: 80px; height: 80px; animation-delay: 0s; }
.p2 { width: 80px; height: 80px; animation-delay: 1.25s; }

@keyframes pulse-out {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(3.5); opacity: 0; }
}

.chip {
  position: absolute;
  padding: 5px 12px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  backdrop-filter: blur(12px);
  animation: chip-float 5s ease-in-out infinite;
}

.chip-tl {
  top: 8px; left: -10px;
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.35);
  color: #fca5a5;
}

.chip-br {
  bottom: 20px; right: -10px;
  background: rgba(99,102,241,0.15);
  border: 1px solid rgba(99,102,241,0.35);
  color: #a5b4fc;
  animation-delay: 1.5s;
}

@keyframes chip-float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
}

/* ─── Trace bar ──────────────────────────────── */
.trace-bar {
  height: 3px;
  background: rgba(255,255,255,0.05);
  overflow: hidden;
}

.trace-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #6366f1, #ec4899, #f97316);
  animation: trace 4s 1s ease-in-out infinite;
}

@keyframes trace {
  0% { width: 0%; margin-left: 0; }
  50% { width: 100%; margin-left: 0; }
  100% { width: 0%; margin-left: 100%; }
}

/* ─── Shared fade-up ─────────────────────────── */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Responsive ─────────────────────────────── */
@media (max-width: 900px) {
  .card-body {
    grid-template-columns: 1fr;
    padding: 36px 28px;
    text-align: center;
  }
  .left { align-items: center; }
  .status-badge { align-self: center; }
  .error-number { justify-content: center; }
  .subtitle { max-width: 100%; }
  .pills { justify-content: center; }
  .actions { justify-content: center; }
  .right { margin-top: 16px; }
  .lock-scene { width: 220px; height: 220px; }
  .o1 { width: 130px; height: 130px; }
  .o2 { width: 170px; height: 170px; }
  .o3 { width: 210px; height: 210px; }
  .lock-svg { width: 88px; height: 104px; }
  .chip-tl { top: 0; left: 0; }
  .chip-br { bottom: 0; right: 0; }
}

@media (max-width: 480px) {
  .denied-root { padding: 16px; }
  .card-body { padding: 24px 20px; }
  .title { font-size: 28px; }
  .status-badge { font-size: 9px; }
  .warning-strip { font-size: 8px; letter-spacing: 0.1em; }
  .pills { gap: 8px; }
  .btn-primary, .btn-secondary {
    padding: 12px 20px;
    font-size: 14px;
    width: 100%;
    justify-content: center;
  }
  .actions { flex-direction: column; width: 100%; }
  .lock-scene { width: 180px; height: 180px; }
  .o1 { width: 100px; height: 100px; }
  .o2 { width: 140px; height: 140px; }
  .o3 { width: 176px; height: 176px; }
  .lock-svg { width: 72px; height: 86px; }
  .chip { display: none; }
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
  `]
})
export class UnauthorizedComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('root')   rootRef!: ElementRef<HTMLDivElement>;

  cardVisible = false;
  private animFrame = 0;
  private particles: Particle[] = [];
  private ctx!: CanvasRenderingContext2D;
  private resizeObs!: ResizeObserver;

  constructor(private router: Router) {}

  ngOnInit(): void {
    setTimeout(() => { this.cardVisible = true; }, 80);
  }

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrame);
    this.resizeObs?.disconnect();
  }

  // ─── Canvas particle system ──────────────────────────────────────────────────
  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    this.resizeObs = new ResizeObserver(resize);
    this.resizeObs.observe(document.documentElement);

    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 14000));
    this.particles = Array.from({ length: count }, () => this.newParticle(canvas));
    this.loop(canvas);
  }

  private newParticle(canvas: HTMLCanvasElement): Particle {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      hue: Math.random() > 0.5 ? 250 : 330,
    };
  }

  private loop(canvas: HTMLCanvasElement): void {
    const { ctx, particles } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0)              p.x = canvas.width;
      if (p.x > canvas.width)   p.x = 0;
      if (p.y < 0)              p.y = canvas.height;
      if (p.y > canvas.height)  p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`;
      ctx.fill();
    }

    // Connect nearby particles with faint lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(120,100,255,${0.08 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    this.animFrame = requestAnimationFrame(() => this.loop(canvas));
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    window.history.back();
  }
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; alpha: number;
  hue: number;
}