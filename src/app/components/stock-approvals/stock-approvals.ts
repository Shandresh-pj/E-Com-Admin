import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { StockApproval, StockApprovalStatus, HcEventType } from 'src/app/models/healthcare.models';
import { formatDateDDMMYYYY, parseDateFromDDMMYYYY } from 'src/app/utils/date-utils';

@Component({
  selector: 'app-stock-approvals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule, MatTooltipModule,
    MatDatepickerModule, MatNativeDateModule, TablerIconsModule,
  ],
  templateUrl: './stock-approvals.html',
  styleUrl: './stock-approvals.scss',
})
export class StockApprovalsComponent implements OnInit, OnDestroy {
  approvals        = signal<StockApproval[]>([]);
  loading          = signal(false);
  saving           = signal(false);
  showForm         = signal(false);
  editingId        = signal<number | null>(null);
  searchQuery      = signal('');
  statusFilter     = signal('');
  viewMode         = signal<'grid' | 'list'>('grid');
  selectedApproval = signal<StockApproval | null>(null);
  formValues       = signal<any>({});
  medicines:       any[] = [];

  filteredApprovals = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sf = this.statusFilter();
    return this.approvals().filter(a =>
      (!sf || a.status === sf) &&
      (!q  ||
        (a.reference_number || '').toLowerCase().includes(q) ||
        (a.supplier_name || '').toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q)
      )
    );
  });

  pendingCount  = computed(() => this.approvals().filter(a => a.status === StockApprovalStatus.PENDING || a.status === StockApprovalStatus.SUBMITTED).length);
  approvedCount = computed(() => this.approvals().filter(a => a.status === StockApprovalStatus.APPROVED).length);
  postedCount   = computed(() => this.approvals().filter(a => a.status === StockApprovalStatus.POSTED).length);
  rejectedCount = computed(() => this.approvals().filter(a => a.status === StockApprovalStatus.REJECTED).length);

  readonly statuses = Object.values(StockApprovalStatus);
  readonly StockApprovalStatus = StockApprovalStatus;
  form!: FormGroup;
  private subs = new Subscription();

  constructor(
    private fb:     FormBuilder,
    private common: CommonService,
    private alert:  AlertService,
    public  perm:   PermissionService,
    private socket: SocketService,
    public  cdr:    ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.load();
    this.loadMedicines();
    this.subs.add(this.socket.on(HcEventType.STOCK_APPROVED).subscribe(() => this.load()));
    this.subs.add(this.socket.on(HcEventType.STOCK_REJECTED).subscribe(() => this.load()));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private buildForm(): void {
    this.form = this.fb.group({
      supplier_name: [''],
      notes:         [''],
      items:         this.fb.array([]),
    });
    this.addItem();

    this.form.valueChanges.subscribe(val => {
      this.formValues.set(val);
      this.cdr.markForCheck();
    });
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.cdr.markForCheck();
  }

  selectStatusFilter(s: string): void {
    this.statusFilter.set(s);
    this.cdr.markForCheck();
  }

  viewApprovalDetails(appr: StockApproval, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedApproval.set(appr);
    this.cdr.markForCheck();
  }

  closeApprovalDetails(): void {
    this.selectedApproval.set(null);
    this.cdr.markForCheck();
  }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  addItem(): void {
    this.items.push(this.fb.group({
      medicine_id:      ['', Validators.required],
      batch_number:     ['', Validators.required],
      manufacture_date: ['', Validators.required],
      expiry_date:      ['', Validators.required],
      quantity:         [0, [Validators.required, Validators.min(1)]],
      unit_cost:        [0, [Validators.required, Validators.min(0)]],
      mrp:              [0, [Validators.required, Validators.min(0)]],
      selling_price:    [0, [Validators.required, Validators.min(0)]],
    }));
  }

  removeItem(idx: number): void { if (this.items.length > 1) this.items.removeAt(idx); }

  private loadMedicines(): void {
    this.common.getApi('medicines?is_active=true').subscribe({ next: (r: any) => { this.medicines = r?.data || []; this.cdr.markForCheck(); } });
  }

  load(): void {
    this.loading.set(true);
    this.common.getApi('stock-approvals').subscribe({
      next:  (r: any) => { this.approvals.set(r?.data || []); this.loading.set(false); this.cdr.markForCheck(); },
      error: ()       => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  openForm(): void { this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.form.value;
    const payload = {
      ...val,
      items: (val.items || []).map((item: any) => ({
        ...item,
        manufacture_date: formatDateDDMMYYYY(item.manufacture_date),
        expiry_date: formatDateDDMMYYYY(item.expiry_date)
      }))
    };
    this.common.postApi('stock-approvals', payload).subscribe({
      next: () => { this.alert.success('Stock approval submitted'); this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => { this.alert.error(e?.error?.message || 'Failed'); this.saving.set(false); this.cdr.markForCheck(); },
    });
  }

  approve(approval: StockApproval): void {
    this.alert.confirm(`Approve stock reference ${approval.reference_number}?`).then((r: any) => {
      if (!r.isConfirmed) return;
      this.common.patchApi(`stock-approvals/${approval.id}/approve`, {}).subscribe({
        next: () => { this.alert.success('Stock approved and posted to inventory'); this.load(); },
        error: (e: any) => this.alert.error(e?.error?.message || 'Approval failed'),
      });
    });
  }

  reject(approval: StockApproval): void {
    this.alert.prompt({ title: 'Rejection Reason', label: 'Reason *' }).then((r: any) => {
      if (!r.isConfirmed || !r.value) return;
      this.common.patchApi(`stock-approvals/${approval.id}/reject`, { rejection_reason: r.value }).subscribe({
        next: () => { this.alert.success('Approval rejected'); this.load(); },
        error: (e: any) => this.alert.error(e?.error?.message || 'Rejection failed'),
      });
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'draft', SUBMITTED: 'submitted', PENDING: 'pending',
      APPROVED: 'approved', POSTED: 'posted', REJECTED: 'rejected',
    };
    return map[status] || '';
  }

  getKpiCount(status: StockApprovalStatus): number {
    return this.approvals().filter(a => a.status === status).length;
  }

  getTotalAmount(items: any[]): number {
    return (items || []).reduce((s, i) => s + (i.quantity * i.unit_cost), 0);
  }

  save(): void { this.submit(); }

  updateStatus(appr: StockApproval, status: StockApprovalStatus): void {
    if (status === StockApprovalStatus.APPROVED) {
      this.approve(appr);
    } else if (status === StockApprovalStatus.REJECTED) {
      this.reject(appr);
    } else {
      this.common.patchApi(`stock-approvals/${appr.id}/status`, { status }).subscribe({
        next: () => { this.alert.success(`Status updated to ${status}`); this.load(); },
        error: (e: any) => this.alert.error(e?.error?.message || 'Update failed'),
      });
    }
  }

  openRejectDialog(appr: StockApproval): void {
    this.reject(appr);
  }

  formatAmount(n: number): string {
    return this.formatPrice(n);
  }

  formatPrice(n: number): string {
    return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  }
}
