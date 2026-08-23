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
  id?: any;
  name?: string;
  email?: string;
  address?: string;
  gstin?: string;
  gst_number?: string;
  phone?: string;
}

export interface InvoiceItem {
  id?: any;
  product_id?: any;
  name?: string;
  description?: string;
  price: number;
  quantity: number;
  product?: { name?: string };
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
  companiesList: CompanyDetails[] = [];
  selectedOrder: any = null;
  currentCompany: CompanyDetails | null = null;
  loading = false;
  apiUrl = environment.apiUrl;
  todayDate = new Date();

  // ── States ────────────────────────────────────────────────────────────
  isPrinting = false;
  isDownloading = false;
  isSaving = false;
  isSendingEmail = false;
  showEmailModal = false;
  downloadProgress = 0;

  // ── Email Form State ──────────────────────────────────────────────────
  emailRecipient = '';
  emailSubject = '';
  emailMessage = '';
  attachPdf = true;

  // ── Customizable Settings State ──────────────────────────────────────
  prefix = 'INV';
  companyCode = 'ABC';
  sequenceLength = 4;
  separator = '-';
  startingNumber = 1;
  includeYear = true;
  includeMonth = true;
  includeDate = false;

  // ── Suggestions State ────────────────────────────────────────────────
  suggestionsList: string[] = [];

  // ── Customizer Settings ──────────────────────────────────────────────
  selectedThemeId = 'aurora';
  invoiceTitle = 'TAX INVOICE';
  currencySymbol = '₹';
  taxRate = 18;
  customBranch = '';
  customGst = '';
  customNotes = 'Thank you for your business. Payment due within 30 days.';

  /** Live QR URL */
  liveQrUrl: SafeUrl | null = null;
  qrRawUrl = '';

  // ── Step Wizard & Progress State ──────────────────────────────────────
  currentStep = 1;

  setStep(step: number) {
    if (step >= 1 && step <= 3) {
      this.currentStep = step;
      this.cdr.detectChanges();
    }
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
      this.cdr.detectChanges();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.cdr.detectChanges();
    }
  }

  get completionPercentage(): number {
    let score = 0;
    if (this.selectedOrder) score += 25;
    if (this.selectedThemeId) score += 15;
    if (this.customBranch && this.customBranch.trim() !== '') score += 15;
    if (this.customGst && this.customGst.trim() !== '') score += 15;
    if (this.taxRate !== null && this.taxRate !== undefined) score += 15;
    if (this.customNotes && this.customNotes.trim() !== '') score += 15;
    return Math.min(100, score);
  }


  // ── Premium Themes ───────────────────────────────────────────────────
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
    {
      id: 'cyberpunk', name: '⚡ Cyberpunk Neon',
      primary: '#0f172a', secondary: '#e11d48', accent: '#06b6d4',
      bg: '#fff1f2', altRow: '#fff5f5',
      textColor: '#0f172a', headerText: '#ffffff',
    },
    {
      id: 'platinum', name: '🏛 Royal Sapphire',
      primary: '#1e1b4b', secondary: '#1d4ed8', accent: '#38bdf8',
      bg: '#f0f9ff', altRow: '#e0f2fe',
      textColor: '#0f172a', headerText: '#ffffff',
    },
    {
      id: 'sunset', name: '🌅 Sunset Gold',
      primary: '#7c2d12', secondary: '#ea580c', accent: '#f59e0b',
      bg: '#fff7ed', altRow: '#ffedd5',
      textColor: '#431407', headerText: '#ffffff',
    },
  ];


  private qrUpdateTimer: any;

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.fetchData();
  }

  ngOnDestroy() {
    if (this.qrUpdateTimer) clearTimeout(this.qrUpdateTimer);
  }

  private getSafeInteger(val: any, defaultVal: number = 1): number {
    if (val === null || val === undefined || val === '') return defaultVal;
    const parsed = parseInt(String(val), 10);
    return isNaN(parsed) || parsed <= 0 ? defaultVal : parsed;
  }

  /**
   * Fetch all dynamic data directly from backend APIs:
   * 1. Dynamic Companies List
   * 2. Dynamic Orders List
   */
  fetchData() {
    this.loading = true;

    // Fetch Companies
    this.commonService.getApi('companies').subscribe({
      next: (compRes: any) => {
        this.companiesList = Array.isArray(compRes?.data) ? compRes.data : (Array.isArray(compRes) ? compRes : []);
        this.loadOrders();
      },
      error: () => {
        this.companiesList = [];
        this.loadOrders();
      }
    });
  }

  loadOrders() {
    this.commonService.getApi('orders').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.ordersList = list.map((o: any, idx: number) => ({
          ...o,
          id: this.getSafeInteger(o?.id, idx + 1),
          invoice_no: o?.invoice_no || `INV-${String(o?.id || idx + 1).padStart(4, '0')}`
        }));

        if (this.ordersList.length > 0) {
          this.selectedOrder = this.ordersList[0];
          this.onOrderChange();
        } else {
          this.selectedOrder = null;
          this.currentCompany = null;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.ordersList = [];
        this.selectedOrder = null;
        this.currentCompany = null;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Header Stat Getters ────────────────────────────────────────────────
  get paidCount(): number {
    return this.ordersList.filter(o => ['PAID', 'COMPLETED', 'SUCCESS'].includes((o.payment_status || o.status || '').toUpperCase())).length;
  }

  get pendingCount(): number {
    return this.ordersList.filter(o => ['PENDING', 'WAITING', 'DRAFT', 'UNPAID', ''].includes((o.payment_status || o.status || '').toUpperCase())).length;
  }

  get overdueCount(): number {
    return this.ordersList.filter(o => ['OVERDUE', 'FAILED', 'DECLINED', 'REJECTED', 'CANCELLED'].includes((o.payment_status || o.status || '').toUpperCase())).length;
  }

  // ── Items Entry Normalization ──────────────────────────────────────────
  get orderItems(): InvoiceItem[] {
    if (!this.selectedOrder) return [];
    const raw = this.selectedOrder.items || this.selectedOrder.order_items || this.selectedOrder.products || this.selectedOrder.line_items || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any, idx: number) => {
      const price = Number(item?.price ?? item?.unit_price ?? item?.rate ?? 0);
      const quantity = Number(item?.quantity ?? item?.qty ?? 1);
      const name = item?.product?.name || item?.name || item?.product_name || `Item #${item?.product_id || (idx + 1)}`;
      return {
        ...item,
        id: item?.id ?? item?.product_id ?? (idx + 1),
        name,
        price: isNaN(price) ? 0 : price,
        quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity
      };
    });
  }

  // ── Customer Normalizers ──────────────────────────────────────────────
  getCustomerName(): string {
    if (!this.selectedOrder) return '';
    return (
      this.selectedOrder.user?.name ||
      this.selectedOrder.customer_name ||
      this.selectedOrder.customer?.name ||
      this.selectedOrder.name ||
      this.selectedOrder.billing_address?.name ||
      ''
    );
  }

  getCustomerEmail(): string {
    if (!this.selectedOrder) return '';
    return (
      this.selectedOrder.user?.email ||
      this.selectedOrder.customer_email ||
      this.selectedOrder.customer?.email ||
      this.selectedOrder.email ||
      this.selectedOrder.billing_address?.email ||
      ''
    );
  }

  getCustomerPhone(): string {
    if (!this.selectedOrder) return '';
    return (
      this.selectedOrder.user?.mobilenumber ||
      this.selectedOrder.user?.phone ||
      this.selectedOrder.customer_phone ||
      this.selectedOrder.customer?.phone ||
      this.selectedOrder.billing_address?.phone ||
      ''
    );
  }

  // ── Dynamic Company Resolution ────────────────────────────────────────
  resolveCompanyForOrder(order: any): CompanyDetails {
    if (!order) return {};
    
    // 1. Direct company attached to order
    if (order.company && typeof order.company === 'object') {
      return order.company;
    }

    // 2. Match company_id from API companies list
    const compId = order.company_id || order.companyId;
    if (compId && this.companiesList.length > 0) {
      const match = this.companiesList.find(c => String(c.id) === String(compId));
      if (match) return match;
    }

    // 3. Fallback to first dynamic company returned from API
    if (this.companiesList.length > 0) {
      return this.companiesList[0];
    }

    return {
      id: compId || '',
      name: order.company_name || '',
      email: order.company_email || '',
      address: order.company_address || '',
      gstin: order.company_gstin || order.gstin || ''
    };
  }

  onOrderChange() {
    if (!this.selectedOrder) return;

    this.currentCompany = this.resolveCompanyForOrder(this.selectedOrder);
    this.customGst = this.currentCompany?.gstin || this.currentCompany?.gst_number || this.selectedOrder?.gstin || '';
    this.customBranch = this.selectedOrder?.branch_name || this.selectedOrder?.branch?.name || this.currentCompany?.name || '';
    this.companyCode = (this.currentCompany?.name || 'INV').substring(0, 3).toUpperCase();
    this.emailRecipient = this.getCustomerEmail();
    
    const compName = this.currentCompany?.name || '';
    const custName = this.getCustomerName();
    const invNo = this.selectedOrder.invoice_no || '';

    this.emailSubject = `Tax Invoice ${invNo} ${compName ? 'from ' + compName : ''}`.trim();
    this.emailMessage = `Dear ${custName || 'Customer'},\n\nPlease find attached tax invoice ${invNo} for your order.\n\nThank you!`;

    this.loadSuggestions();

    if (this.qrUpdateTimer) clearTimeout(this.qrUpdateTimer);
    this.qrUpdateTimer = setTimeout(() => this.refreshQr(), 300);
  }

  refreshQr() {
    if (!this.selectedOrder) {
      this.liveQrUrl = null;
      return;
    }
    const colorHex = this.theme().primary.replace('#', '');
    const payload = JSON.stringify({
      inv: this.selectedOrder.invoice_no || '',
      cmp: this.currentCompany?.name || '',
      gst: this.customGst,
      date: this.selectedOrder.created_at || new Date(),
      sub: this.calcSubtotal().toFixed(2),
      tax: this.calcTax().toFixed(2),
      tot: this.calculatePreviewTotal().toFixed(2),
      status: this.statusLabel()
    });

    const url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}&color=${colorHex}&bgcolor=ffffff`;
    this.qrRawUrl = url;

    this.liveQrUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    this.cdr.detectChanges();
  }

  selectTheme(id: string) {
    this.selectedThemeId = id;
    this.refreshQr();
    this.cdr.detectChanges();
  }

  theme(): InvoiceTheme {
    return this.themes.find(t => t.id === this.selectedThemeId) || this.themes[0];
  }

  // ── Calculations ──────────────────────────────────────────────────────
  calcSubtotal(): number {
    const items = this.orderItems;
    if (!items.length) return 0;
    return items.reduce((sum: number, i: InvoiceItem) => sum + (i.price * i.quantity), 0);
  }

  calcDiscount(): number {
    const d = Number(this.selectedOrder?.discount || this.selectedOrder?.discount_amount || 0);
    return isNaN(d) || d < 0 ? 0 : d;
  }

  calcTax(): number {
    return Math.max(0, (this.calcSubtotal() - this.calcDiscount()) * (this.taxRate / 100));
  }

  calculatePreviewTotal(): number {
    return Math.max(0, this.calcSubtotal() - this.calcDiscount() + this.calcTax());
  }

  statusClass(): string {
    const s = (this.selectedOrder?.payment_status || this.selectedOrder?.status || 'PENDING').toUpperCase();
    if (['PAID', 'COMPLETED', 'SUCCESS'].includes(s)) return 'paid';
    if (['FAILED', 'DECLINED', 'REJECTED', 'CANCELLED'].includes(s)) return 'failed';
    return 'pending';
  }

  statusLabel(): string {
    return (this.selectedOrder?.payment_status || this.selectedOrder?.status || 'PENDING').toUpperCase();
  }

  onSettingsChange() {
    this.loadSuggestions();
  }

  loadSuggestions() {
    if (!this.selectedOrder) return;
    this.generateLocalSuggestions();
  }

  generateLocalSuggestions() {
    const yr = new Date().getFullYear();
    const mo = String(new Date().getMonth() + 1).padStart(2, '0');
    const dt = String(new Date().getDate()).padStart(2, '0');

    const validSeqLen = this.getSafeInteger(this.sequenceLength, 4);
    const validStartNum = this.getSafeInteger(this.startingNumber, 1);
    const prefixStr = String(this.prefix || 'INV');
    const compCodeStr = String(this.companyCode || 'ABC');
    const sepStr = String(this.separator || '-');

    let parts = [prefixStr, compCodeStr];
    if (this.includeYear) parts.push(String(yr));
    if (this.includeMonth) parts.push(mo);
    if (this.includeDate) parts.push(dt);

    const base = parts.filter(Boolean).join(sepStr);
    this.suggestionsList = [1, 2, 3, 4, 5].map(n => {
      const seqNum = validStartNum + n - 1;
      const seq = String(seqNum).padStart(validSeqLen, '0');
      return `${base}${sepStr}${seq}`;
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

    const compId = this.getSafeInteger(this.currentCompany?.id || this.selectedOrder.company_id, 1);
    const rawCustId = this.selectedOrder.user_id || this.selectedOrder.customer_id || this.selectedOrder.user?.id;
    const custId = rawCustId ? this.getSafeInteger(rawCustId, 1) : null;

    const payload = {
      company_id: compId,
      invoice_number: String(this.selectedOrder.invoice_no || 'INV-0001'),
      customer_id: custId,
      invoice_date: this.selectedOrder.created_at || new Date(),
      subtotal: Number(this.calcSubtotal() || 0),
      tax: Number(this.calcTax() || 0),
      discount: Number(this.calcDiscount() || 0),
      total: Number(this.calculatePreviewTotal() || 0),
      status: this.statusLabel()
    };

    this.http.post<{success: boolean, message?: string}>(`${this.apiUrl}/invoices/create`, payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.alert.success(res?.message || 'Invoice finalized and saved successfully!');
        this.loadSuggestions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        this.alert.warning(err?.error?.message || 'Failed to save invoice to server.');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Email Send Logic ──────────────────────────────────────────────────
  openEmailModal() {
    if (!this.selectedOrder) {
      this.alert.warning('Please select an order first.');
      return;
    }
    this.emailRecipient = this.getCustomerEmail();
    this.emailSubject = `Tax Invoice ${this.selectedOrder.invoice_no || ''} - ${this.currentCompany?.name || 'Enterprise'}`;
    this.emailMessage = `Dear ${this.getCustomerName()},\n\nPlease find attached tax invoice ${this.selectedOrder.invoice_no || ''} for your order totalling ${this.currencySymbol}${this.calculatePreviewTotal().toFixed(2)}.\n\nThank you for doing business with us!`;
    this.showEmailModal = true;
    this.cdr.detectChanges();
  }

  closeEmailModal() {
    this.showEmailModal = false;
    this.cdr.detectChanges();
  }

  sendInvoiceEmail() {
    if (!this.emailRecipient || !this.emailRecipient.includes('@')) {
      this.alert.warning('Please enter a valid recipient email address.');
      return;
    }

    const orderId = this.getSafeInteger(this.selectedOrder?.id, 1);
    const compId = this.getSafeInteger(this.currentCompany?.id || this.selectedOrder?.company_id, 1);

    this.isSendingEmail = true;
    this.cdr.detectChanges();

    const payload = {
      order_id: orderId,
      invoice_number: String(this.selectedOrder?.invoice_no || 'INV-0001'),
      company_id: compId,
      recipient_email: this.emailRecipient,
      subject: this.emailSubject,
      message: this.emailMessage,
      attach_pdf: Boolean(this.attachPdf),
      theme: this.selectedThemeId || 'aurora',
      total_amount: Number(this.calculatePreviewTotal() || 0)
    };

    this.http.post<{success: boolean, message?: string}>(`${this.apiUrl}/invoices/send-email`, payload).subscribe({
      next: (res) => {
        this.isSendingEmail = false;
        this.showEmailModal = false;
        this.alert.success(res?.message || `Invoice successfully sent to ${this.emailRecipient}!`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSendingEmail = false;
        this.showEmailModal = false;
        this.alert.warning(err?.error?.message || 'Failed to dispatch invoice email.');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Download PDF Logic ───────────────────────────────────────────────
  downloadCustomInvoice() {
    if (!this.selectedOrder && this.ordersList.length > 0) {
      this.selectedOrder = this.ordersList[0];
      this.onOrderChange();
    }

    if (!this.selectedOrder) {
      this.alert.warning('Please select an order first.');
      return;
    }

    const orderId = this.getSafeInteger(this.selectedOrder?.id, 1);
    const taxRateVal = isNaN(Number(this.taxRate)) ? 18 : Math.max(0, Number(this.taxRate));

    this.isDownloading = true;
    this.downloadProgress = 0;
    this.cdr.detectChanges();

    const params = new HttpParams({
      fromObject: {
        theme: this.selectedThemeId || 'aurora',
        title: this.invoiceTitle || 'TAX INVOICE',
        gst: this.customGst || '',
        notes: this.customNotes || '',
        branch: this.customBranch || '',
        taxRate: String(taxRateVal),
        currency: this.currencySymbol || '₹',
      }
    });

    this.http.get(`${this.apiUrl}/orders/invoice-pdf/${orderId}`, {
      params,
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === 1) {
          if (event.total) {
            this.downloadProgress = Math.round((100 * event.loaded) / event.total);
          } else {
            this.downloadProgress = 50;
          }
          this.cdr.detectChanges();
        } else if (event.type === 4) {
          const blob = event.body as Blob;

          if (blob && blob.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const parsed = JSON.parse(reader.result as string);
                this.alert.error(parsed?.message || 'Failed to generate invoice PDF.');
              } catch {
                this.alert.error('Failed to generate or download invoice PDF.');
              }
              this.isDownloading = false;
              this.downloadProgress = 0;
              this.cdr.detectChanges();
            };
            reader.readAsText(blob);
            return;
          }

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safeName = (this.selectedOrder.invoice_no || `INV-${orderId}`).replace(/[/\\?%*:|"<>]/g, '-');
          a.download = `Invoice-${safeName}.pdf`;
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
      error: () => {
        this.isDownloading = false;
        this.downloadProgress = 0;
        this.alert.info('Opening browser print dialog to generate PDF...');
        setTimeout(() => window.print(), 300);
        this.cdr.detectChanges();
      }
    });
  }

  // ── View Mode & Quick Utilities ──────────────────────────────────────
  viewMode: 'a4' | 'thermal' | 'compact' = 'a4';

  setViewMode(mode: 'a4' | 'thermal' | 'compact') {
    this.viewMode = mode;
    this.cdr.detectChanges();
  }

  copyInvoiceNo() {
    if (!this.selectedOrder?.invoice_no) return;
    navigator.clipboard.writeText(this.selectedOrder.invoice_no);
    this.alert.success(`Invoice number ${this.selectedOrder.invoice_no} copied to clipboard!`);
  }

  copyShareLink() {
    if (!this.selectedOrder) return;
    const shareUrl = `${window.location.origin}/invoices?inv=${encodeURIComponent(this.selectedOrder.invoice_no || this.selectedOrder.id)}`;
    navigator.clipboard.writeText(shareUrl);
    this.alert.success('Shareable invoice link copied to clipboard!');
  }
}