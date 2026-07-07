import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface CompanyDetails {
  id: string;
  name: string;
  email: string;
  address: string;
  gstin: string;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
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
  currentCompany: CompanyDetails | null = null;
  loading = false;
  apiUrl = environment.apiUrl;

  // ── Print & Download & Save States ───────────────────────────────────
  isPrinting = false;
  isDownloading = false;
  isSaving = false;
  downloadProgress = 0;

  // ── Customizable settings state ──────────────────────────────────────
  prefix = 'INV';
  companyCode = 'ABC';
  sequenceLength = 4;
  separator = '-';
  startingNumber = 1;
  includeYear = true;
  includeMonth = true;
  includeDate = false;

  // ── Suggestions state ────────────────────────────────────────────────
  suggestionsList: string[] = [];

  // ── Customizer settings ──────────────────────────────────────────────
  selectedThemeId = 'aurora';
  invoiceTitle = 'TAX INVOICE';
  currencySymbol = '₹';
  taxRate = 18;
  customBranch = 'Mumbai Sector-4 Distribution';
  customGst = '27AAAC1234A1Z1';
  customNotes = 'Thank you for choosing us! Items are covered under a 1-year merchant warranty. Payment due within 30 days.';

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

  // Predefined unique companies
  private companyPool: CompanyDetails[] = [
    { id: '101', name: 'TechNova Solutions', email: 'billing@technova.io', address: '12 Tech Park, Bangalore', gstin: '29AAACT1234A1Z1' },
    { id: '102', name: 'Nexus Logistics', email: 'accounts@nexuslogistics.com', address: '45 Port Road, Mumbai', gstin: '27AAACN1234A1Z2' },
    { id: '103', name: 'Aurora Retails', email: 'finance@auroraretails.in', address: '89 High Street, Delhi', gstin: '07AAACA1234A1Z3' },
    { id: '104', name: 'Quantum Manufacturing', email: 'tax@quantum.com', address: 'Sector 9, Pune', gstin: '27AAACQ1234A1Z4' },
    { id: '105', name: 'BizCore Enterprise', email: 'admin@bizcore.io', address: 'Corporate Hub, Chennai', gstin: '33AAACB1234A1Z5' }
  ];

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private http: HttpClient
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
          this.onOrderChange(); // Trigger initial generation
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; }
    });
  }

  /**
   * Deterministically assigns a company based on the invoice_no characters
   */
  generateCompanyForInvoice(invoiceNo: string): CompanyDetails {
    if (!invoiceNo) return this.companyPool[0];
    let hash = 0;
    for (let i = 0; i < invoiceNo.length; i++) {
      hash = invoiceNo.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.companyPool.length;
    return this.companyPool[index];
  }

  onOrderChange() {
    if (this.selectedOrder) {
      // Set unique company based on invoice ID
      this.currentCompany = this.generateCompanyForInvoice(this.selectedOrder.invoice_no);
      this.customGst = this.currentCompany.gstin; // Override GST based on company
      
      // Auto-extract prefix and company code for suggestions
      this.companyCode = this.currentCompany.name.substring(0, 3).toUpperCase();
      this.loadSuggestions();
    }

    if (this.qrUpdateTimer) clearTimeout(this.qrUpdateTimer);
    this.qrUpdateTimer = setTimeout(() => this.refreshQr(), 400);
  }

  refreshQr() {
    if (!this.selectedOrder) return;
    const payload = JSON.stringify({
      inv: this.selectedOrder.invoice_no || 'N/A',
      cmp: this.currentCompany?.name,
      tot: this.calculatePreviewTotal().toFixed(2),
    });
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

  // ── customizable settings triggers ──────────────────────────────────
  onSettingsChange() {
    this.loadSuggestions();
  }

  // ── Suggestions ──────────────────────────────────────────────────────
  loadSuggestions() {
    if (!this.selectedOrder) return;
    const companyId = this.currentCompany?.id || '101';
    
    const params = new HttpParams({
      fromObject: {
        company_id: companyId,
        prefix: this.prefix,
        company_code: this.companyCode,
        separator: this.separator,
        sequence_length: String(this.sequenceLength),
        starting_number: String(this.startingNumber),
        include_year: String(this.includeYear),
        include_month: String(this.includeMonth),
        include_date: String(this.includeDate)
      }
    });

    this.http.get<{success: boolean, data: string[]}>(`${this.apiUrl}/invoices/suggestions`, { params }).subscribe({
      next: (res) => {
        if (res.success) {
          this.suggestionsList = res.data || [];
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error fetching suggestions:', err);
      }
    });
  }

  selectSuggestion(suggestion: string) {
    if (this.selectedOrder) {
      this.selectedOrder.invoice_no = suggestion;
      this.refreshQr();
      this.cdr.detectChanges();
    }
  }

  // ── Print Logic ──────────────────────────────────────────────────────
  printInvoice() {
    if (!this.selectedOrder) {
      this.alert.warning('No order selected to print.');
      return;
    }
    this.isPrinting = true;
    this.cdr.detectChanges();

    // Small delay to allow UI to render spinner and disabled states
    setTimeout(() => {
      window.print();
      this.isPrinting = false;
      this.cdr.detectChanges();
    }, 250);
  }

  // ── Save & Finalize Invoice ──────────────────────────────────────────
  createInvoice() {
    if (!this.selectedOrder) {
      this.alert.warning('Please select an order first.');
      return;
    }
    this.isSaving = true;
    this.cdr.detectChanges();

    const payload = {
      company_id: Number(this.currentCompany?.id || 101),
      invoice_number: this.selectedOrder.invoice_no,
      customer_id: this.selectedOrder.user_id || null,
      invoice_date: this.selectedOrder.created_at || new Date(),
      subtotal: this.calcSubtotal(),
      tax: this.calcTax(),
      discount: this.calcDiscount(),
      total: this.calculatePreviewTotal(),
      status: this.statusLabel()
    };

    this.http.post<{success: boolean, message?: string}>(`${this.apiUrl}/invoices/create`, payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.alert.success(res.message || 'Invoice finalized and saved successfully!');
        this.loadSuggestions(); // Reload used suggestions
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err?.error?.message || 'Invoice finalization failed.';
        this.alert.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  // ── Download Logic (with automatic file creation & progress events) ───
  downloadCustomInvoice() {
    if (!this.selectedOrder) {
      this.alert.warning('Please select an order first.');
      return;
    }
    this.isDownloading = true;
    this.downloadProgress = 0;
    this.cdr.detectChanges();

    const params = new HttpParams({
      fromObject: {
        theme: this.selectedThemeId,
        title: this.invoiceTitle,
        gst: this.customGst,
        notes: this.customNotes,
        branch: this.customBranch,
        taxRate: String(this.taxRate),
        currency: this.currencySymbol,
      }
    });

    this.http.get(`${this.apiUrl}/orders/invoice/${this.selectedOrder.id}`, {
      params,
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === 1) { // DownloadProgress event
          if (event.total) {
            this.downloadProgress = Math.round((100 * event.loaded) / event.total);
          } else {
            this.downloadProgress = 50; // Fallback
          }
          this.cdr.detectChanges();
        } else if (event.type === 4) { // Response complete
          const blob = event.body;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice-${this.selectedOrder.invoice_no || this.selectedOrder.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          this.isDownloading = false;
          this.downloadProgress = 0;
          this.alert.success('Invoice PDF downloaded successfully!');
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error(err);
        this.isDownloading = false;
        this.downloadProgress = 0;
        this.alert.error('Failed to generate or download invoice PDF.');
        this.cdr.detectChanges();
      }
    });
  }
}