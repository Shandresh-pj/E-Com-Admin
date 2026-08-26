import {
  Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatSelectModule, MatFormFieldModule, MatTooltipModule, TablerIconsModule,
  ],
  templateUrl: './medicine-expiry.html',
  styleUrl: './medicine-expiry.scss',
})
export class MedicineExpiryComponent implements OnInit {
  batches       = signal<ExpiryBatch[]>([]);
  loading       = signal(false);
  searchQuery   = signal('');
  statusFilter  = signal('');
  warningWindow = signal(90);
  viewMode      = signal<'grid' | 'list'>('grid');
  selectedBatch = signal<ExpiryBatch | null>(null);

  readonly Math = Math;
  readonly statusOptions = Object.values(ExpiryStatus);
  readonly statusMeta    = EXPIRY_STATUS_META;
  readonly warningWindows = [30, 60, 90, 180];

  filteredBatches = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sf = this.statusFilter();
    return this.batches().filter(b =>
      (!sf || b.expiry_status === sf) &&
      (!q  ||
        (b.medicine_name || '').toLowerCase().includes(q) ||
        (b.batch_number || '').toLowerCase().includes(q)
      )
    );
  });

  safeCount     = computed(() => this.batches().filter(b => b.expiry_status === ExpiryStatus.SAFE).length);
  expiringCount = computed(() => this.batches().filter(b => b.expiry_status === ExpiryStatus.EXPIRING_SOON).length);
  criticalCount = computed(() => this.batches().filter(b => b.expiry_status === ExpiryStatus.CRITICAL).length);
  expiredCount  = computed(() => this.batches().filter(b => b.expiry_status === ExpiryStatus.EXPIRED).length);

  summary = { expired: 0, critical: 0, expiring_soon: 0 };

  constructor(
    private common: CommonService,
    public  cdr:    ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadSummary();
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.cdr.markForCheck();
  }

  selectStatusFilter(sf: string): void {
    this.statusFilter.set(sf);
    this.cdr.markForCheck();
  }

  viewBatchDetails(b: ExpiryBatch, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedBatch.set(b);
    this.cdr.markForCheck();
  }

  closeBatchDetails(): void {
    this.selectedBatch.set(null);
    this.cdr.markForCheck();
  }

  load(): void {
    this.loading.set(true);
    this.common.getApi(`medicine-expiry?days=${this.warningWindow()}`).subscribe({
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
    this.warningWindow.set(days);
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
