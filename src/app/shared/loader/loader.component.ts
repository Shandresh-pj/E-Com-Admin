import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ChangeDetectionStrategy,
  ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader.service';

interface Module {
  name: string;
  color: string;
  done: boolean;
}

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('particleCanvas', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  isVisible = true;
  progress = 0;
  loadingText = 'Connecting to servers';

  modules: Module[] = [
    { name: 'Auth Engine',   color: '#6366f1', done: false },
    { name: 'Data Layer',    color: '#06b6d4', done: false },
    { name: 'UI Components', color: '#8b5cf6', done: false },
    { name: 'Analytics',     color: '#ec4899', done: false },
    { name: 'Permissions',   color: '#f59e0b', done: false },
    { name: 'Socket Layer',  color: '#10b981', done: false },
  ];

  private readonly texts = [
    'Connecting to servers',
    'Loading modules',
    'Applying permissions',
    'Configuring workspace',
    'Almost ready',
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];
  private rafId = 0;
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];

  constructor(
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.runProgressSequence();
  }

  ngAfterViewInit(): void {
    this.initParticles();
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
    cancelAnimationFrame(this.rafId);
  }

  // ── Progress + module sequence ───────────────────────────────────────────
  private runProgressSequence(): void {
    let current = 0;
    const targets = [18, 35, 52, 68, 80, 92, 100];
    const moduleOrder = [0, 1, 2, 3, 4, 5];
    let textIdx = 0;

    const advance = () => {
      if (current >= targets.length) return;

      const target = targets[current];
      const mod = moduleOrder[current];

      // Animate progress to target
      this.animateTo(target, () => {
        // Mark module as done
        if (mod !== undefined) {
          this.modules[mod].done = true;
        }
        // Rotate text
        textIdx = Math.min(textIdx + 1, this.texts.length - 1);
        this.loadingText = this.texts[textIdx];
        this.cdr.markForCheck();

        current++;
        if (current < targets.length) {
          const delay = 300 + Math.random() * 400;
          this.timers.push(setTimeout(advance, delay));
        } else {
          // All done — hide loader
          this.timers.push(setTimeout(() => {
            this.isVisible = false;
            this.cdr.markForCheck();
          }, 500));
        }
      });
    };

    this.timers.push(setTimeout(advance, 200));
  }

  private animateTo(target: number, done: () => void): void {
    const step = () => {
      if (this.progress >= target) {
        done();
        return;
      }
      this.progress = Math.min(this.progress + 1, target);
      this.cdr.markForCheck();
      this.timers.push(setTimeout(step, 22));
    };
    step();
  }

  // ── Canvas particle system ───────────────────────────────────────────────
  private initParticles(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b'];
    for (let i = 0; i < 60; i++) {
      this.particles.push(new Particle(canvas.width, canvas.height, colors));
    }

    // Run canvas animation outside Angular zone (no change detection)
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        if (!this.isVisible) return;
        this.drawParticles(canvas.width, canvas.height);
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    });
  }

  private drawParticles(w: number, h: number): void {
    this.ctx.clearRect(0, 0, w, h);
    for (const p of this.particles) {
      p.update(w, h);
      p.draw(this.ctx);
    }
  }
}

// ── Particle class ──────────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  life: number;
  maxLife: number;

  constructor(w: number, h: number, colors: string[]) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = -(Math.random() * 0.8 + 0.2);
    this.radius = Math.random() * 2.5 + 0.5;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.alpha = 0;
    this.targetAlpha = Math.random() * 0.7 + 0.2;
    this.life = 0;
    this.maxLife = Math.random() * 200 + 100;
  }

  update(w: number, h: number): void {
    this.life++;
    this.x += this.vx;
    this.y += this.vy;

    // Fade in / fade out
    const half = this.maxLife / 2;
    this.alpha = this.life < half
      ? (this.life / half) * this.targetAlpha
      : ((this.maxLife - this.life) / half) * this.targetAlpha;

    // Respawn
    if (this.life >= this.maxLife || this.y < -10) {
      this.x = Math.random() * w;
      this.y = h + 10;
      this.vy = -(Math.random() * 0.8 + 0.2);
      this.vx = (Math.random() - 0.5) * 0.6;
      this.life = 0;
      this.maxLife = Math.random() * 200 + 100;
      this.targetAlpha = Math.random() * 0.7 + 0.2;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = this.radius * 6;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}
