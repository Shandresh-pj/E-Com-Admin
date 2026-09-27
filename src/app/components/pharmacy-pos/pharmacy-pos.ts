import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import {
  SaleItem, PaymentMethod, PaymentStatus,
  HcEventType, StockStatus
} from 'src/app/models/healthcare.models';

interface CartItem {
  medicine_id:   number;
  medicine_name: string;
  generic_name:  string;
  batch_id:      number;
  batch_number:  string;
  expiry_date:   string;
  available_qty: number;
  quantity:      number;
  unit_price:    number;
  discount_pct:  number;
  amount:        number;
  stock_status:  StockStatus;
}

@Component({
  selector: 'app-pharmacy-pos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule, MatTooltipModule, TablerIconsModule,
  ],
  templateUrl: './pharmacy-pos.html',
  styleUrl: './pharmacy-pos.scss',
})
export class PharmacyPosComponent implements OnInit, OnDestroy {
  // ── Signals ────────────────────────────────────────────────────────────────
  searchQuery     = signal('');
  searchResults   = signal<any[]>([]);
  searching       = signal(false);
  private search$ = new Subject<string>();

  patientQuery    = signal('');
  patients        = signal<any[]>([]);
  selectedPatient = signal<any | null>(null);

  cart            = signal<CartItem[]>([]);

  discountAmount  = signal(0);
  paymentMethod   = signal<PaymentMethod>(PaymentMethod.CASH);
  paidAmount      = signal(0);
  processing      = signal(false);

  // ── Batch picker ───────────────────────────────────────────────────────────
  showBatchPicker   = signal(false);
  batchPickerMed:   any = null;
  availableBatches: any[] = [];
  patientResults:   any[] = [];

  // ── Computed Properties ────────────────────────────────────────────────────
  subtotal     = computed(() => this.cart().reduce((s, i) => s + i.amount, 0));
  grandTotal   = computed(() => Math.max(0, this.subtotal() - this.discountAmount()));
  balance      = computed(() => this.grandTotal() - this.paidAmount());
  totalCartQty = computed(() => this.cart().reduce((acc, c) => acc + c.quantity, 0));
  cartEmpty    = computed(() => this.cart().length === 0);

  readonly paymentMethods = Object.values(PaymentMethod);
  readonly Math = Math;
  private subs = new Subscription();

  constructor(
    private common:  CommonService,
    private alert:   AlertService,
    private socket:  SocketService,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Debounced medicine search
    this.subs.add(
      this.search$
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(q => this.doSearch(q))
    );

    // Real-time stock-out warning
    this.subs.add(
      this.socket.on(HcEventType.STOCK_UPDATED).subscribe((data: any) => {
        const inCart = this.cart().find(c => c.batch_id === data?.batch_id);
        if (inCart && data?.new_quantity < inCart.quantity) {
          this.alert.warning(`Stock for ${inCart.medicine_name} reduced. Please verify cart quantity.`);
        }
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ── Compatibility Getters & Aliases ───────────────────────────────────────
  get cartItems() { return this.cart(); }
  get submitting() { return this.processing(); }
  get balanceAmount(): number { return this.balance(); }
  get showBatchModal() { return this.showBatchPicker; }
  get selectedMedicineForBatch() { return this.batchPickerMed; }

  get patientSearchQuery(): string { return this.patientQuery(); }
  set patientSearchQuery(val: string) { this.patientQuery.set(val); }

  get selectedPaymentMethod(): PaymentMethod { return this.paymentMethod(); }
  set selectedPaymentMethod(pm: PaymentMethod) { this.paymentMethod.set(pm); }

  removePatient(): void {
    this.selectedPatient.set(null);
    this.patientQuery.set('');
    this.patientResults = [];
    this.cdr.markForCheck();
  }

  onPatientSearch(event: any): void {
    const q = typeof event === 'string' ? event : (event?.target?.value || '');
    this.patientQuery.set(q);
    if (!q.trim()) { this.patientResults = []; return; }
    this.common.getApi(`patients?search=${encodeURIComponent(q.trim())}`).subscribe({
      next: (r: any) => { this.patientResults = r?.data || []; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  selectPatient(p: any): void {
    this.selectedPatient.set(p);
    this.patientQuery.set('');
    this.patientResults = [];
    this.cdr.markForCheck();
  }

  submitSale(): void {
    this.processPayment();
  }

  // ── Search & Batch Methods ─────────────────────────────────────────────────
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    if (!query.trim()) { this.searchResults.set([]); return; }
    this.search$.next(query.trim());
  }

  private doSearch(q: string): void {
    this.searching.set(true);
    this.common.getApi(`medicines/search?q=${encodeURIComponent(q)}`).subscribe({
      next: (r: any) => { this.searchResults.set(r?.data || []); this.searching.set(false); this.cdr.markForCheck(); },
      error: () => { this.searching.set(false); this.cdr.markForCheck(); },
    });
  }

  selectMedicine(med: any): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    // Load batches for FEFO selection
    this.common.getApi(`medicines/${med.id}/batches?available=true`).subscribe({
      next: (r: any) => {
        const batches = r?.data || [];
        if (batches.length === 1) {
          this.addToCart(med, batches[0]);
        } else if (batches.length > 1) {
          this.batchPickerMed = med;
          this.availableBatches = batches;
          this.showBatchPicker.set(true);
          this.cdr.markForCheck();
        } else {
          this.alert.warning(`${med.name} is out of stock`);
        }
      },
      error: () => this.alert.error('Failed to load batches'),
    });
  }

  selectBatch(batch: any): void {
    this.addToCart(this.batchPickerMed, batch);
    this.showBatchPicker.set(false);
    this.batchPickerMed = null;
  }

  closeBatchModal(): void {
    this.showBatchPicker.set(false);
    this.batchPickerMed = null;
  }

  addBatchToCart(batch: any): void {
    this.selectBatch(batch);
  }

  private addToCart(med: any, batch: any): void {
    const existingIdx = this.cart().findIndex(c => c.batch_id === batch.id);
    if (existingIdx >= 0) {
      const updated = [...this.cart()];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].amount = this.calcAmount(updated[existingIdx]);
      this.cart.set(updated);
    } else {
      const item: CartItem = {
        medicine_id:   med.id,
        medicine_name: med.name,
        generic_name:  med.generic_name,
        batch_id:      batch.id,
        batch_number:  batch.batch_number,
        expiry_date:   batch.expiry_date,
        available_qty: batch.quantity,
        quantity:      1,
        unit_price:    batch.selling_price,
        discount_pct:  0,
        amount:        batch.selling_price,
        stock_status:  med.stock_status,
      };
      this.cart.set([...this.cart(), item]);
    }
    this.cdr.markForCheck();
  }

  updateQuantity(idx: number, qty: number): void {
    this.updateQty(idx, qty);
  }

  updateQty(idx: number, qty: number): void {
    const updated = [...this.cart()];
    const item = updated[idx];
    if (qty < 1) return;
    if (qty > item.available_qty) {
      this.alert.warning(`Only ${item.available_qty} units available for ${item.medicine_name}`);
      return;
    }
    item.quantity = qty;
    item.amount = this.calcAmount(item);
    this.cart.set(updated);
    this.cdr.markForCheck();
  }

  onQtyInputChange(idx: number, event: any): void {
    const val = parseInt(event.target.value, 10);
    if (!isNaN(val)) this.updateQty(idx, val);
  }

  removeItem(idx: number): void {
    this.cart.set(this.cart().filter((_, i) => i !== idx));
    this.cdr.markForCheck();
  }

  clearCart(): void {
    this.alert.confirm('All items will be removed.', 'Clear cart?').then((r: any) => {
      if (r.isConfirmed) {
        this.cart.set([]);
        this.discountAmount.set(0);
        this.paidAmount.set(0);
        this.cdr.markForCheck();
      }
    });
  }

  private calcAmount(item: CartItem): number {
    const base = item.unit_price * item.quantity;
    return base - (base * item.discount_pct / 100);
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
  processPayment(): void {
    if (this.cartEmpty()) { this.alert.warning('Cart is empty'); return; }
    if (this.paidAmount() < this.grandTotal()) {
      this.alert.warning('Paid amount is less than grand total');
      return;
    }
    this.processing.set(true);

    const payload = {
      patient_id:      this.selectedPatient()?.id || null,
      items:           this.cart().map(c => ({
        medicine_id:  c.medicine_id,
        batch_id:     c.batch_id,
        quantity:     c.quantity,
        unit_price:   c.unit_price,
        discount_pct: c.discount_pct,
        amount:       c.amount,
      })),
      subtotal:        this.subtotal(),
      discount_amount: this.discountAmount(),
      grand_total:     this.grandTotal(),
      paid_amount:     this.paidAmount(),
      balance_amount:  this.balance(),
      payment_method:  this.paymentMethod(),
      payment_status:  this.balance() <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
    };

    this.common.postApi('pharmacy/sale', payload).subscribe({
      next: (res: any) => {
        this.alert.success(`Sale completed! Invoice ${res?.data?.sale_code || ''}`);
        this.processing.set(false);
        this.resetPos();
        this.cdr.markForCheck();
      },
      error: (e: any) => {
        this.alert.error(e?.error?.message || 'Sale failed. Please try again.');
        this.processing.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private resetPos(): void {
    this.cart.set([]);
    this.discountAmount.set(0);
    this.paidAmount.set(0);
    this.paymentMethod.set(PaymentMethod.CASH);
    this.selectedPatient.set(null);
    this.patientQuery.set('');
  }

  formatPrice(n: number): string {
    return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Converts enum display label: 'CASH' → 'Cash', 'LOW_STOCK' → 'Low Stock' */
  paymentLabel(pm: PaymentMethod): string {
    return pm.charAt(0) + pm.slice(1).toLowerCase().replace(/_/g, ' ');
  }
}
