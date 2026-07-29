import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Star { x: number; y: number; w: number; o: number; d: number; dur: number; }

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
  statusText = 'Connecting to secure gateway…';
  stars: Star[] = [];

  /** Conic-gradient ring style bound via [style] */
  get ringStyle(): string {
    const deg = this.pct * 3.6; // 0–360
    return `--p:${deg}deg`;
  }

  /** SVG stroke dashoffset calculation for smooth 2D ring loader */
  get strokeDashoffset(): number {
    const circumference = 282.74; // 2 * PI * 45 radius
    return circumference - (this.pct / 100) * circumference;
  }

  private readonly steps: [number, string, number][] = [
    [18,  'Connecting to secure gateway…',    300],
    [38,  'Loading application engine…',     340],
    [64,  'Optimizing visual renderer…',     320],
    [86,  'Applying security policies…',     300],
    [100, 'Workspace ready!',                0  ],
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.buildStars();
    this.timers.push(setTimeout(() => this.run(0), 150));
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  private buildStars(): void {
    for (let i = 0; i < 65; i++) {
      this.stars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        w: Math.random() * 2.5 + 1,
        o: Math.random() * 0.7 + 0.2,
        d: -(Math.random() * 6),
        dur: Math.random() * 4 + 3,
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
        }, 480));
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
      this.timers.push(setTimeout(tick, 14));
    };
    tick();
  }
}
