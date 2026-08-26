import {
  Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TablerIconsModule } from 'angular-tabler-icons';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { ExpiryStatus, EXPIRY_STATUS_META } from 'src/app/models/healthcare.models';

interface ExpiryBatch {
  id:            number;
  medicine_id:   number;
  medicine_name: string;
  batch_number:  string;
  expiry_date:   string;
  manufacture_date?: string;
  quantity:      number;
  expiry_status: ExpiryStatus;
  days_to_expiry: number;
}

@Component({
  selector: 'app-medicine-expiry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatProgressSpinnerModule,
    MatSelectModule, MatFormFieldModule, TablerIconsModule,
  ],
  templateUrl: './medicine-expiry.html',
  styleUrl: './medicine-expiry.scss',
})
export class MedicineExpiryComponent implements OnInit {
  batches        = signal<ExpiryBatch[]>([]);
  loading        = signal(false);
  statusFilter   = '';
  warningWindow  = 90; // configurable warning window (days)

  /** Expose Math to template */
  readonly Math = Math;

  readonly statusOptions = Object.values(ExpiryStatus);
  readonly statusMeta    = EXPIRY_STATUS_META;
  readonly warningWindows = [30, 60, 90, 180];

  filteredBatches = () => {
    const sf = this.statusFilter;
    return this.batches().filter(b => !sf || b.expiry_status === sf);
  };

  get kpis() {
    const all = this.batches();
    return {
      safe:         all.filter(b => b.expiry_status === ExpiryStatus.SAFE).length,
      expiring:     all.filter(b => b.expiry_status === ExpiryStatus.EXPIRING_SOON).length,
      critical:     all.filter(b => b.expiry_status === ExpiryStatus.CRITICAL).length,
      expired:      all.filter(b => b.expiry_status === ExpiryStatus.EXPIRED).length,
    };
  }

  constructor(
    private common: CommonService,
    public  cdr:    ChangeDetectorRef,
  ) {}

  summary = { expired: 0, critical: 0, expiring_soon: 0 };

  ngOnInit(): void {
    this.load();
    this.loadSummary();
  }

  load(): void {
    this.loading.set(true);
    this.common.getApi(`medicine-expiry?days=${this.warningWindow}`).subscribe({
      next:  (r: any) => { this.batches.set(r?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()       => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  loadSummary(): void {
    this.common.getApi('medicine-expiry/summary').subscribe({
      next: (r: any) => { this.summary = r?.data || { expired: 0, critical: 0, expiring_soon: 0 }; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  changeWindow(days: number): void {
    this.warningWindow = days;
    this.load();
  }

  getStatusClass(status: ExpiryStatus): string {
    return this.statusMeta[status]?.cssClass || '';
  }

  getStatusLabel(status: ExpiryStatus): string {
    return this.statusMeta[status]?.label || status;
  }

  getDaysLabel(days: number): string {
    if (days < 0)  return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
    if (days === 0) return 'Expires today';
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  }
}
