import {
  Component, OnInit, ChangeDetectorRef, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

export type CalView = 'calendar' | 'list' | 'timeline';

interface HolidayDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  holiday: any | null;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TablerIconsModule, AppTranslatePipe],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss'
})
export class CompanyCalendarComponent implements OnInit {

  // ─── Data ──────────────────────────────────────────────────────────────
  holidaysList: any[] = [];
  filteredHolidays: any[] = [];
  loading = signal(false);
  saving  = signal(false);
  searchQuery = '';
  filterType  = 'ALL';

  // ─── View ──────────────────────────────────────────────────────────────
  activeView = signal<CalView>('calendar');

  // ─── Calendar Grid ─────────────────────────────────────────────────────
  currentDate    = signal(new Date());
  calendarDays   = signal<HolidayDay[][]>([]);
  selectedDay    = signal<HolidayDay | null>(null);

  readonly MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  readonly DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  get currentMonthName() { return this.MONTH_NAMES[this.currentDate().getMonth()]; }
  get currentYear()      { return this.currentDate().getFullYear(); }

  // ─── Stats ─────────────────────────────────────────────────────────────
  totalHolidays     = 0;
  mandatoryHolidays = 0;
  optionalHolidays  = 0;
  nextHoliday: any  = null;
  daysToNextHoliday = 0;

  // ─── Form ──────────────────────────────────────────────────────────────
  holidayForm: FormGroup;
  showForm   = signal(false);
  editingId: number | null = null;

  // ─── Delete confirm ────────────────────────────────────────────────────
  confirmDeleteId = signal<number | null>(null);

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public  perm: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.holidayForm = this.fb.group({
      holiday_name: ['', Validators.required],
      holiday_date: ['', Validators.required],
      type:         ['MANDATORY', Validators.required],
      description:  ['']
    });
  }

  ngOnInit(): void { this.loadHolidays(); }

  // ─── API ───────────────────────────────────────────────────────────────
  loadHolidays(): void {
    this.loading.set(true);
    this.commonService.getApi('calendar/holidays').subscribe({
      next: (res: any) => {
        this.holidaysList = res?.data || [];
        this.applyFilter();
        this.calculateStats();
        this.buildCalendarGrid();
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  applyFilter(): void {
    let list = [...this.holidaysList];
    if (this.filterType !== 'ALL') list = list.filter(h => h.type === this.filterType);
    const q = this.searchQuery.toLowerCase().trim();
    if (q) list = list.filter(h =>
      h.holiday_name.toLowerCase().includes(q) ||
      h.type.toLowerCase().includes(q) ||
      (h.description && h.description.toLowerCase().includes(q))
    );
    this.filteredHolidays = list;
  }

  calculateStats(): void {
    this.totalHolidays     = this.holidaysList.length;
    this.mandatoryHolidays = this.holidaysList.filter(h => h.type === 'MANDATORY').length;
    this.optionalHolidays  = this.holidaysList.filter(h => h.type === 'OPTIONAL').length;

    const today = new Date(); today.setHours(0,0,0,0);
    const upcoming = this.holidaysList
      .map(h => ({ ...h, _d: new Date(h.holiday_date) }))
      .filter(h => h._d >= today)
      .sort((a, b) => a._d.getTime() - b._d.getTime());

    this.nextHoliday = upcoming.length > 0 ? upcoming[0] : null;
    if (this.nextHoliday) {
      const diff = this.nextHoliday._d.getTime() - today.getTime();
      this.daysToNextHoliday = Math.round(diff / (1000 * 60 * 60 * 24));
    }
  }

  // ─── Calendar Grid Builder ─────────────────────────────────────────────
  buildCalendarGrid(): void {
    const d = this.currentDate();
    const year  = d.getFullYear();
    const month = d.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth    = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date(); today.setHours(0,0,0,0);
    const holidayMap = new Map<string, any>();
    this.holidaysList.forEach(h => holidayMap.set(h.holiday_date?.split('T')[0], h));

    const cells: HolidayDay[] = [];

    // Leading days from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push(this.makeDay(date, false, today, holidayMap));
    }
    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      cells.push(this.makeDay(date, true, today, holidayMap));
    }
    // Trailing days from next month
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      cells.push(this.makeDay(date, false, today, holidayMap));
    }

    // Split into weeks
    const weeks: HolidayDay[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    this.calendarDays.set(weeks);
  }

  private makeDay(date: Date, isCurrentMonth: boolean, today: Date, map: Map<string, any>): HolidayDay {
    const key = date.toISOString().split('T')[0];
    return {
      date, day: date.getDate(), isCurrentMonth,
      isToday: date.getTime() === today.getTime(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      holiday: map.get(key) || null
    };
  }

  prevMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.buildCalendarGrid();
  }
  nextMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.buildCalendarGrid();
  }
  goToday(): void {
    this.currentDate.set(new Date());
    this.buildCalendarGrid();
  }

  selectDay(day: HolidayDay): void {
    this.selectedDay.set(this.selectedDay()?.date.getTime() === day.date.getTime() ? null : day);
  }

  // ─── Timeline grouping ─────────────────────────────────────────────────
  get timelineMonths(): { month: string; year: number; holidays: any[] }[] {
    const map = new Map<string, any[]>();
    this.filteredHolidays.forEach(h => {
      const d = new Date(h.holiday_date);
      const key = `${this.MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...h, _d: d });
    });
    return Array.from(map.entries()).map(([k, v]) => {
      const parts = k.split(' ');
      return { month: parts[0], year: +parts[1], holidays: v.sort((a,b) => a._d - b._d) };
    });
  }

  // ─── Form ──────────────────────────────────────────────────────────────
  openForm(item?: any): void {
    if (item) {
      this.editingId = item.id;
      this.holidayForm.patchValue({
        holiday_name: item.holiday_name,
        holiday_date: item.holiday_date?.split('T')[0],
        type: item.type,
        description: item.description
      });
    } else {
      this.editingId = null;
      this.holidayForm.reset({ type: 'MANDATORY' });
    }
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId = null;
    this.holidayForm.reset({ type: 'MANDATORY' });
  }

  saveHoliday(): void {
    if (this.holidayForm.invalid) { this.holidayForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const body = this.holidayForm.value;
    const req$ = this.editingId
      ? this.commonService.putApi(`calendar/holidays/${this.editingId}`, body)
      : this.commonService.postApi('calendar/holidays', body);

    req$.subscribe({
      next: (res: any) => {
        this.alert.success(res?.message || 'Holiday saved successfully.');
        this.saving.set(false);
        this.closeForm();
        this.loadHolidays();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to save holiday.');
        this.saving.set(false);
      }
    });
  }

  confirmDelete(id: number): void  { this.confirmDeleteId.set(id); }
  cancelDelete(): void             { this.confirmDeleteId.set(null); }

  deleteHoliday(id: number): void {
    this.loading.set(true);
    this.commonService.deleteApi(`calendar/holidays/${id}`).subscribe({
      next: () => {
        this.alert.success('Holiday deleted.');
        this.confirmDeleteId.set(null);
        this.loadHolidays();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to delete.');
        this.loading.set(false);
        this.confirmDeleteId.set(null);
      }
    });
  }

  getDayOfWeek(dateStr: string): string {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[new Date(dateStr).getDay()];
  }

  isUpcoming(dateStr: string): boolean {
    return new Date(dateStr) >= new Date(new Date().toDateString());
  }

  isPast(dateStr: string): boolean {
    return new Date(dateStr) < new Date(new Date().toDateString());
  }
}
