import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Particle { x: number; y: number; size: number; dur: number; delay: number; color: string; }
export interface Bar { height: number; dur: number; delay: number; }

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent implements OnInit, OnDestroy {

  isVisible = true;
  pct = 0;
  statusText = 'Initializing…';
  particles: Particle[] = [];
  bars: Bar[] = [];

  /** SVG stroke offset for main progress arc (r=42, circumference=263.9) */
  get strokeDashoffset(): number {
    return 263.9 - (this.pct / 100) * 263.9;
  }

  /** Inner pulse ring offset (r=34, circumference=213.6) */
  get innerOffset(): number {
    return 213.6 - (this.pct / 100) * 213.6;
  }

  private readonly steps: [number, string, number][] = [
    [15,  'Establishing secure connection…', 280],
    [34,  'Loading application modules…',    320],
    [58,  'Syncing live data streams…',      300],
    [80,  'Applying security policies…',     260],
    [100, 'Ready!',                           0 ],
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this._buildParticles();
    this._buildBars();
    this.timers.push(setTimeout(() => this.run(0), 180));
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  private _buildParticles(): void {
    const colors = ['#6366f1', '#06b6d4', '#ec4899', '#818cf8', '#34d399'];
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x:     Math.random() * 100,
        y:     Math.random() * 100,
        size:  Math.random() * 3 + 1.5,
        dur:   Math.random() * 6 + 4,
        delay: -(Math.random() * 8),
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  private _buildBars(): void {
    for (let i = 0; i < 9; i++) {
      this.bars.push({
        height: Math.random() * 55 + 20,
        dur:    Math.random() * 0.6 + 0.5,
        delay:  i * 0.08
      });
    }
  }

  private run(i: number): void {
    if (i >= this.steps.length) return;
    const [target, text, pause] = this.steps[i];
    this.statusText = text;
    this.cdr.markForCheck();

    this.animateTo(target, () => {
      if (target === 100) {
        this.timers.push(setTimeout(() => {
          this.isVisible = false;
          this.cdr.markForCheck();
        }, 520));
      } else {
        this.timers.push(setTimeout(() => this.run(i + 1), pause));
      }
    });
  }

  private animateTo(target: number, done: () => void): void {
    const tick = () => {
      if (this.pct >= target) { done(); return; }
      this.pct = Math.min(this.pct + 1, target);
      this.cdr.markForCheck();
      this.timers.push(setTimeout(tick, 12));
    };
    tick();
  }
}
