import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ClockTimePickerData {
  title?: string;
  startTime?: string; // e.g. "09:00" or "09:00 AM"
  endTime?: string;   // e.g. "17:00" or "05:00 PM"
  isRange?: boolean;
}

@Component({
  selector: 'app-clock-timepicker',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './clock-timepicker.html',
  styleUrls: ['./clock-timepicker.scss']
})
export class ClockTimepickerComponent implements OnInit {

  title = 'Select Time';
  isRange = true;

  // 12-hour values
  startHour   = 9;  startMinute  = 0;  startAmPm: 'AM' | 'PM' = 'AM';
  endHour     = 5;  endMinute    = 0;  endAmPm:   'AM' | 'PM' = 'PM';

  activeMode: 'start' | 'end' = 'start';
  /** 'hours' or 'minutes' — which ring is active */
  clockView: 'hours' | 'minutes' = 'hours';

  // 12 hour positions for hour dial
  hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Minute markers every 5 minutes for the outer ring (0, 5, 10, … 55)
  minuteMarkers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // All 60 minute ticks for fine grain selection
  minuteTicks  = Array.from({ length: 60 }, (_, i) => i);

  constructor(
    public dialogRef: MatDialogRef<ClockTimepickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClockTimePickerData
  ) {
    if (data) {
      if (data.title)                this.title   = data.title;
      if (data.isRange !== undefined) this.isRange = data.isRange;
      if (data.startTime) this.parseInitialTime(data.startTime, 'start');
      if (data.endTime)   this.parseInitialTime(data.endTime,   'end');
    }
  }

  ngOnInit(): void {}

  parseInitialTime(timeStr: string, mode: 'start' | 'end') {
    if (!timeStr) return;
    const parts = timeStr.trim().split(' ');
    const time  = parts[0];
    let ampm    = parts[1]?.toUpperCase() as 'AM' | 'PM';
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10) || 12;
    const m = parseInt(mStr, 10) || 0;
    if (!ampm) { ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; }
    if (mode === 'start') { this.startHour = h; this.startMinute = m; this.startAmPm = ampm; }
    else                  { this.endHour   = h; this.endMinute   = m; this.endAmPm   = ampm; }
  }

  // ─── Active getters ────────────────────────────────────────────────────────
  get currentHour():   number        { return this.activeMode === 'start' ? this.startHour   : this.endHour;   }
  get currentMinute(): number        { return this.activeMode === 'start' ? this.startMinute : this.endMinute; }
  get currentAmPm():   'AM' | 'PM'  { return this.activeMode === 'start' ? this.startAmPm   : this.endAmPm;   }

  // ─── Selection ─────────────────────────────────────────────────────────────
  selectHour(h: number) {
    if (this.activeMode === 'start') this.startHour   = h;
    else                             this.endHour     = h;
    // Auto-advance to minute selection after hour picked
    this.clockView = 'minutes';
  }

  selectMinute(m: number) {
    if (this.activeMode === 'start') this.startMinute = m;
    else                             this.endMinute   = m;
  }

  toggleAmPm(ampm?: 'AM' | 'PM') {
    const next = ampm || (this.currentAmPm === 'AM' ? 'PM' : 'AM');
    if (this.activeMode === 'start') this.startAmPm = next;
    else                             this.endAmPm   = next;
  }

  setMode(mode: 'start' | 'end') {
    this.activeMode = mode;
    this.clockView  = 'hours';
  }

  switchClockView(v: 'hours' | 'minutes') { this.clockView = v; }

  // ─── Geometry ──────────────────────────────────────────────────────────────
  /** Returns {left, top} for an item at position `index` out of `total`,
   *  placed on a circle of given `radius` (px), centred at 50%/50% of a
   *  260×260 container. Offset positions so item centre is at the point. */
  private polarStyle(angleDeg: number, radiusPx: number, nodeSize = 36) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const cx  = 130;
    const cy  = 130;
    const x   = Math.round(cx + radiusPx * Math.cos(rad) - nodeSize / 2);
    const y   = Math.round(cy + radiusPx * Math.sin(rad) - nodeSize / 2);
    return { left: `${x}px`, top: `${y}px` };
  }

  getHourStyle(h: number)    { return this.polarStyle((h % 12) * 30,   100, 36); }
  getMinuteStyle(m: number)  { return this.polarStyle(m * 6,            100, 30); }

  /** Clock hand angle in degrees */
  get handAngleDeg(): number {
    if (this.clockView === 'hours')
      return (this.currentHour % 12) * 30;
    return this.currentMinute * 6;
  }

  /** SVG hand tip X coordinate */
  get tipX(): number {
    const rad = ((this.handAngleDeg - 90) * Math.PI) / 180;
    return Math.round(130 + 100 * Math.cos(rad));
  }
  /** SVG hand tip Y coordinate */
  get tipY(): number {
    const rad = ((this.handAngleDeg - 90) * Math.PI) / 180;
    return Math.round(130 + 100 * Math.sin(rad));
  }
  /** SVG hand line end X (shorter than tip) */
  get handX2(): number {
    const rad = ((this.handAngleDeg - 90) * Math.PI) / 180;
    return Math.round(130 + 78 * Math.cos(rad));
  }
  /** SVG hand line end Y */
  get handY2(): number {
    const rad = ((this.handAngleDeg - 90) * Math.PI) / 180;
    return Math.round(130 + 78 * Math.sin(rad));
  }

  // ─── Arc (range mode) ──────────────────────────────────────────────────────
  get ArcPath(): string {
    const startAngle = (this.startHour % 12) * 30;
    let   endAngle   = (this.endHour   % 12) * 30;
    if (endAngle <= startAngle) endAngle += 360;
    const r  = 100; const cx = 130; const cy = 130;
    const sr = ((startAngle - 90) * Math.PI) / 180;
    const er = ((endAngle   - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(sr); const y1 = cy + r * Math.sin(sr);
    const x2 = cx + r * Math.cos(er); const y2 = cy + r * Math.sin(er);
    const lg = (endAngle - startAngle) <= 180 ? 0 : 1;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`;
  }

  // ─── Duration ──────────────────────────────────────────────────────────────
  get durationText(): string {
    const s24 = (this.startHour % 12) + (this.startAmPm === 'PM' ? 12 : 0)
              + this.startMinute / 60;
    const e24 = (this.endHour   % 12) + (this.endAmPm   === 'PM' ? 12 : 0)
              + this.endMinute   / 60;
    let diff = e24 - s24;
    if (diff <= 0) diff += 24;
    const hrs  = Math.floor(diff);
    const mins = Math.round((diff - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hr`;
  }

  // ─── Formatted outputs ─────────────────────────────────────────────────────
  get formattedStartTime24(): string {
    const h = (this.startHour % 12) + (this.startAmPm === 'PM' ? 12 : 0);
    return `${String(h).padStart(2,'0')}:${String(this.startMinute).padStart(2,'0')}`;
  }
  get formattedEndTime24(): string {
    const h = (this.endHour % 12) + (this.endAmPm === 'PM' ? 12 : 0);
    return `${String(h).padStart(2,'0')}:${String(this.endMinute).padStart(2,'0')}`;
  }
  get formattedStartTime12(): string {
    return `${String(this.startHour).padStart(2,'0')}:${String(this.startMinute).padStart(2,'0')} ${this.startAmPm}`;
  }
  get formattedEndTime12(): string {
    return `${String(this.endHour).padStart(2,'0')}:${String(this.endMinute).padStart(2,'0')} ${this.endAmPm}`;
  }

  close()   { this.dialogRef.close(null); }
  confirm() {
    this.dialogRef.close({
      startTime24: this.formattedStartTime24,
      endTime24:   this.formattedEndTime24,
      startTime12: this.formattedStartTime12,
      endTime12:   this.formattedEndTime12,
      duration:    this.durationText
    });
  }
}
