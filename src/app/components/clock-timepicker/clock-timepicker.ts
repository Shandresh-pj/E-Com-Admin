import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ClockTimePickerData {
  title?: string;
  startTime?: string; // e.g. "09:00" or "09:00 AM"
  endTime?: string;   // e.g. "17:00" or "05:00 PM"
  isRange?: boolean;  // whether picking start + end or single time
}

@Component({
  selector: 'app-clock-timepicker',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './clock-timepicker.html',
  styleUrls: ['./clock-timepicker.scss']
})
export class ClockTimepickerComponent implements OnInit {

  title = 'Select Duration & Time';
  isRange = true;

  // Selected values in 12-hour format
  startHour = 9;   // 1 to 12
  startMinute = 0; // 0 to 59
  startAmPm: 'AM' | 'PM' = 'AM';

  endHour = 5;
  endMinute = 0;
  endAmPm: 'AM' | 'PM' = 'PM';

  activeMode: 'start' | 'end' = 'start';

  // Clock dial positions (12 hours)
  hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  constructor(
    public dialogRef: MatDialogRef<ClockTimepickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClockTimePickerData
  ) {
    if (data) {
      if (data.title) this.title = data.title;
      if (data.isRange !== undefined) this.isRange = data.isRange;
      if (data.startTime) this.parseInitialTime(data.startTime, 'start');
      if (data.endTime) this.parseInitialTime(data.endTime, 'end');
    }
  }

  ngOnInit(): void {}

  parseInitialTime(timeStr: string, mode: 'start' | 'end') {
    if (!timeStr) return;
    const parts = timeStr.trim().split(' ');
    let time = parts[0];
    let ampm = parts[1]?.toUpperCase() as 'AM' | 'PM';

    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10) || 12;
    const m = parseInt(mStr, 10) || 0;

    if (!ampm) {
      ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
    }

    if (mode === 'start') {
      this.startHour = h;
      this.startMinute = m;
      this.startAmPm = ampm;
    } else {
      this.endHour = h;
      this.endMinute = m;
      this.endAmPm = ampm;
    }
  }

  // Get current active values
  get currentHour(): number {
    return this.activeMode === 'start' ? this.startHour : this.endHour;
  }
  get currentMinute(): number {
    return this.activeMode === 'start' ? this.startMinute : this.endMinute;
  }
  get currentAmPm(): 'AM' | 'PM' {
    return this.activeMode === 'start' ? this.startAmPm : this.endAmPm;
  }

  // Select an hour from dial
  selectHour(h: number) {
    if (this.activeMode === 'start') {
      this.startHour = h;
    } else {
      this.endHour = h;
    }
  }

  // Toggle AM / PM
  toggleAmPm(ampm?: 'AM' | 'PM') {
    const next = ampm || (this.currentAmPm === 'AM' ? 'PM' : 'AM');
    if (this.activeMode === 'start') {
      this.startAmPm = next;
    } else {
      this.endAmPm = next;
    }
  }

  // Switch between Start Time and End Time selection
  setMode(mode: 'start' | 'end') {
    this.activeMode = mode;
  }

  // Calculate position angle in degrees for clock hands/nodes (0 degree = 12 o'clock)
  getHourAngle(h: number): number {
    return (h % 12) * 30;
  }

  // Position numbers circularly around clock dial (radius 100px)
  getHourStyle(h: number) {
    const angle = (h % 12) * 30 - 90; // -90 deg so 12 is top
    const rad = (angle * Math.PI) / 180;
    const radius = 100; // px
    const x = Math.round(130 + radius * Math.cos(rad) - 20);
    const y = Math.round(130 + radius * Math.sin(rad) - 20);

    return {
      left: `${x}px`,
      top: `${y}px`
    };
  }

  // Arc path SVG for range highlight
  get ArcPath(): string {
    const startAngle = this.getHourAngle(this.startHour);
    let endAngle = this.getHourAngle(this.endHour);
    if (endAngle <= startAngle) {
      endAngle += 360;
    }

    const r = 100;
    const cx = 130;
    const cy = 130;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Calculate duration in hours
  get durationText(): string {
    let start24 = this.startHour % 12 + (this.startAmPm === 'PM' ? 12 : 0);
    let end24 = this.endHour % 12 + (this.endAmPm === 'PM' ? 12 : 0);

    let diff = end24 - start24;
    if (diff <= 0) diff += 24;

    return `${diff} hr`;
  }

  // Format formatted 24h string HH:mm for form fields
  get formattedStartTime24(): string {
    let h24 = this.startHour % 12 + (this.startAmPm === 'PM' ? 12 : 0);
    const hh = String(h24).padStart(2, '0');
    const mm = String(this.startMinute).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  get formattedEndTime24(): string {
    let h24 = this.endHour % 12 + (this.endAmPm === 'PM' ? 12 : 0);
    const hh = String(h24).padStart(2, '0');
    const mm = String(this.endMinute).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  get formattedStartTime12(): string {
    const hh = String(this.startHour).padStart(2, '0');
    const mm = String(this.startMinute).padStart(2, '0');
    return `${hh}:${mm} ${this.startAmPm}`;
  }

  get formattedEndTime12(): string {
    const hh = String(this.endHour).padStart(2, '0');
    const mm = String(this.endMinute).padStart(2, '0');
    return `${hh}:${mm} ${this.endAmPm}`;
  }

  close() {
    this.dialogRef.close(null);
  }

  confirm() {
    this.dialogRef.close({
      startTime24: this.formattedStartTime24,
      endTime24: this.formattedEndTime24,
      startTime12: this.formattedStartTime12,
      endTime12: this.formattedEndTime12,
      duration: this.durationText
    });
  }
}
