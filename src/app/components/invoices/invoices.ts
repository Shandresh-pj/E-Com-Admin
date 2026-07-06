import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { environment } from 'src/environment/environment';

export interface InvoiceTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  altRow: string;
  textColor: string;
  headerText: string;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './invoices.html',
  styleUrl: './invoices.scss'
})
export class Invoices implements OnInit, OnDestroy {
  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  ordersList: any[] = [];
  selectedOrder: any = null;
  loading = false;
  apiUrl = environment.apiUrl;

  // ── Customizer settings ──────────────────────────────────────────────
  selectedThemeId = 'aurora';
  invoiceTitle = 'TAX INVOICE';
  currencySymbol = '₹';
  taxRate = 18;
  customBranch = 'Mumbai Sector-4 Distribution';
  customGst = '27AAAC1234A1Z1';
  customNotes = 'Thank you for choosing BizCore Enterprise! Items are covered under 1-year merchant warranty. Payment due within 30 days.';

  /** The live QR data-URL generated from order data */
  liveQrUrl: SafeUrl | null = null;
  qrRawUrl = '';

  // ── Premium themes ───────────────────────────────────────────────────
  themes: InvoiceTheme[] = [
    {
      id: 'aurora', name: '✦ Aurora Violet',
      primary: '#5b21b6', secondary: '#7c3aed', accent: '#06b6d4',
      bg: '#f5f3ff', altRow: '#faf5ff',
      textColor: '#1e1b4b', headerText: '#ffffff',
    },
    {
      id: 'corporate', name: '◆ Corporate Navy',
      primary: '#1e3a8a', secondary: '#2563eb', accent: '#0ea5e9',
      bg: '#eff6ff', altRow: '#f0f9ff',
      textColor: '#0f172a', headerText: '#ffffff',
    },
    {
      id: 'obsidian', name: '◈ Luxury Obsidian',
      primary: '#1c1917', secondary: '#b45309', accent: '#d97706',
      bg: '#fffbeb', altRow: '#fefce8',
      textColor: '#111827', headerText: '#ffffff',
    },
    {
      id: 'green', name: '◉ Eco Emerald',
      primary: '#064e3b', secondary: '#059669', accent: '#34d399',
      bg: '#ecfdf5', altRow: '#f0fdf4',
      textColor: '#022c22', headerText: '#ffffff',
    },
    {
      id: 'classic', name: '▣ Slate Classic',
      primary: '#1e293b', secondary: '#334155', accent: '#64748b',
      bg: '#f1f5f9', altRow: '#f8fafc',
      textColor: '#0f172a', headerText: '#ffffff',
    },
  ];

  private qrUpdateTimer: any;

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() { this.loadOrders(); }
  ngOnDestroy() { if (this.qrUpdateTimer) clearTimeout(this.qrUpdateTimer); }

  loadOrders() {
    this.loading = true;
    this.commonService.getApi('orders').subscribe({
      next: (res: any) => {
        this.ordersList = res?.data || [];
        if (this.ordersList.length > 0) {
          this.selectedOrder = this.ordersList[0];
          this.refreshQr();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; }
    });
  }

  onOrderChange() {
    if (this.qrUpdateTimer) clearTimeout(this.qrUpdateTimer);
    this.qrUpdateTimer = setTimeout(() => this.refreshQr(), 400);
  }

  refreshQr() {
    if (!this.selectedOrder) return;
    const payload = JSON.stringify({
      inv: this.selectedOrder.invoice_no || 'N/A',
      id: this.selectedOrder.id,
      tot: this.calculatePreviewTotal().toFixed(2),
    });
    // Google Charts QR API (free, no npm needed)
    const url = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(payload)}&choe=UTF-8&chld=H|1`;
    this.qrRawUrl = url;
    this.liveQrUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    this.cdr.detectChanges();
  }

  // ── Theme helpers ────────────────────────────────────────────────────
  selectTheme(id: string) {
    this.selectedThemeId = id;
    this.cdr.detectChanges();
  }

  theme(): InvoiceTheme {
    return this.themes.find(t => t.id === this.selectedThemeId) || this.themes[0];
  }

  // ── Calculations ──────────────────────────────────────────────────────
  calcSubtotal(): number {
    if (!this.selectedOrder?.items?.length) return 0;
    return this.selectedOrder.items.reduce(
      (s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0
    );
  }

  calcDiscount(): number { return Number(this.selectedOrder?.discount) || 0; }

  calcTax(): number {
    return Math.max(0, (this.calcSubtotal() - this.calcDiscount()) * (this.taxRate / 100));
  }

  calculatePreviewTotal(): number {
    return Math.max(0, this.calcSubtotal() - this.calcDiscount() + this.calcTax());
  }

  statusClass(): string {
    const s = (this.selectedOrder?.payment_status || 'PENDING').toUpperCase();
    if (['PAID', 'COMPLETED', 'SUCCESS'].includes(s)) return 'paid';
    if (['FAILED', 'DECLINED', 'REJECTED'].includes(s)) return 'failed';
    return 'pending';
  }

  statusLabel(): string {
    return (this.selectedOrder?.payment_status || 'PENDING').toUpperCase();
  }

  // ── Download ──────────────────────────────────────────────────────────
  downloadCustomInvoice() {
    if (!this.selectedOrder) {
      this.alert.warning('Please select an order first.');
      return;
    }
    const params = new URLSearchParams({
      theme: this.selectedThemeId,
      title: this.invoiceTitle,
      gst: this.customGst,
      notes: this.customNotes,
      branch: this.customBranch,
      taxRate: String(this.taxRate),
      currency: this.currencySymbol,
    });
    window.open(`${this.apiUrl}/orders/invoice/${this.selectedOrder.id}?${params}`, '_blank');
    this.alert.success(`Generating ${this.theme().name} invoice PDF…`);
  }
}
