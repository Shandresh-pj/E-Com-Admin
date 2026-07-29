import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Star  { x:number; y:number; w:number; o:number; d:number; dur:number; }
export interface Mod   { name:string; color:string; done:boolean; }

@Component({
  selector   : 'app-loader',
  standalone : true,
  imports    : [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl   : './loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent implements OnInit, OnDestroy {

  isVisible  = true;
  pct        = 0;
  statusText = 'Connecting to servers…';

  stars: Star[] = [];
  modules: Mod[] = [
    { name: 'Auth Engine',   color: '#6366f1', done: false },
    { name: 'Data Layer',    color: '#06b6d4', done: false },
    { name: 'UI Renderer',   color: '#8b5cf6', done: false },
    { name: 'Permissions',   color: '#ec4899', done: false },
    { name: 'Analytics',     color: '#f59e0b', done: false },
    { name: 'Socket Layer',  color: '#10b981', done: false },
  ];

  /** Conic-gradient ring style bound via [style] */
  get ringStyle(): string {
    const deg = this.pct * 3.6; // 0–360
    return `--p:${deg}deg`;
  }

  private readonly steps: [number, string, number, number][] = [
    // [target%, text, modIdx, pauseMs]
    [16,  'Connecting to servers…',      0, 340],
    [33,  'Loading core modules…',       1, 380],
    [52,  'Rendering UI components…',    2, 360],
    [68,  'Applying role permissions…',  3, 340],
    [83,  'Initialising analytics…',     4, 310],
    [96,  'Connecting socket layer…',    5, 0  ],
    [100, 'Workspace ready!',           -1, 0  ],
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.buildStars();
    this.timers.push(setTimeout(() => this.run(0), 180));
  }

  ngOnDestroy(): void { this.timers.forEach(clearTimeout); }

  private buildStars(): void {
    for (let i = 0; i < 55; i++) {
      this.stars.push({
        x  : Math.random() * 100,
        y  : Math.random() * 100,
        w  : Math.random() * 2 + 1,
        o  : Math.random() * 0.6 + 0.15,
        d  : -(Math.random() * 6),
        dur: Math.random() * 4 + 3,
      });
    }
  }

  private run(i: number): void {
    if (i >= this.steps.length) return;
    const [target, text, modIdx, pause] = this.steps[i];
    this.statusText = text;
    this.cdr.markForCheck();

    this.animateTo(target, () => {
      if (modIdx >= 0) {
        this.modules[modIdx].done = true;
        this.cdr.markForCheck();
      }
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
      this.timers.push(setTimeout(tick, 16));
    };
    tick();
  }
}
