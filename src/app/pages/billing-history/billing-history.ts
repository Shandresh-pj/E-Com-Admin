import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../material.module';
import { CommonService } from '../../Securities/Services/common.service';
import { AlertService } from '../../Securities/Services/alert.service';
import { SocketService } from '../../Securities/Services/socket.service';

@Component({
  selector: 'app-billing-history',
  standalone: true,
  imports: [CommonModule, MaterialModule, TitleCasePipe, RouterLink],
  templateUrl: './billing-history.html',
  styleUrls: ['./billing-history.scss']
})
export class BillingHistoryComponent implements OnInit, OnDestroy {
  invoices      = signal<any[]>([]);
  isLoading     = signal(false);
  isDownloading = signal(false);
  selectedInvoice = signal<any>(null);
  searchQuery   = signal('');

  @ViewChild('invoicePrintArea') invoicePrintArea!: ElementRef;

  private destroy$ = new Subject<void>();

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    this.fetchInvoices();

    // Auto-refresh when backend emits invoice events
    this.socketService.on('subscription.invoice.created')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchInvoices());

    this.socketService.on('subscription.activated')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchInvoices());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchInvoices(): void {
    this.isLoading.set(true);
    this.commonService.getApi('subscription-invoices').subscribe({
      next: (res: any) => {
        this.invoices.set(res?.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        // Rely on global errorInterceptor for user alert toast
      }
    });
  }

  get filteredInvoices(): any[] {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.invoices();
    return this.invoices().filter(inv =>
      (inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.status || '').toLowerCase().includes(q) ||
      (inv.plan_details?.name || '').toLowerCase().includes(q)
    );
  }

  viewInvoice(invoice: any): void {
    this.selectedInvoice.set(invoice);
  }

  closeInvoice(): void {
    this.selectedInvoice.set(null);
  }

  getTotalPaid(): number {
    return this.invoices()
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }

  getPaidCount(): number {
    return this.invoices().filter(i => i.status === 'paid').length;
  }

  getPendingCount(): number {
    return this.invoices().filter(i => i.status === 'pending').length;
  }

  /** Download invoice as PDF using browser Print API — most reliable method */
  async downloadPDF(): Promise<void> {
    const invoice = this.selectedInvoice();
    if (!invoice) return;

    this.isDownloading.set(true);

    // Small delay to ensure DOM has rendered
    await new Promise(resolve => setTimeout(resolve, 100));

    const printContent = this.buildInvoiceHTML(invoice);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      this.alert.warning('Please allow popups to download the invoice.');
      this.isDownloading.set(false);
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then trigger print-to-PDF
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
        this.isDownloading.set(false);
      };
      // Fallback close after 5s if onafterprint doesn't fire
      setTimeout(() => {
        try { printWindow.close(); } catch {}
        this.isDownloading.set(false);
      }, 5000);
    };
  }

  printInvoice(): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    const printContent = this.buildInvoiceHTML(invoice);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  private buildInvoiceHTML(inv: any): string {
    const customer = inv.customer_details || inv.company_details || {};
    const plan     = inv.plan_details || inv.subscription?.plan || {};
    const amount   = Number(inv.amount || 0);
    const subtotal = Number(inv.subtotal || 0) || amount;
    const gst      = Number(inv.gst_amount || 0);
    const discount = Number(inv.discount_amount || 0);
    const currency = inv.currency || 'INR';
    const symbol   = currency === 'INR' ? '₹' : '$';
    const fmt      = (v: number) => `${symbol}${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const dateStr  = inv.created_at
      ? new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : '-';
    const billingCycle = (inv.subscription?.billing_cycle || 'monthly');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${inv.invoice_number || inv.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; }
    .invoice { max-width: 800px; margin: 0 auto; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #6366f1; }
    .brand { }
    .brand h1 { font-size: 28px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
    .brand p { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta .invoice-label { font-size: 32px; font-weight: 900; color: #1a1a2e; letter-spacing: 4px; text-transform: uppercase; }
    .invoice-meta p { font-size: 13px; color: #6b7280; margin-top: 6px; }
    .invoice-meta strong { color: #374151; }
    .badge-paid { display: inline-block; background: #d1fae5; color: #059669; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .badge-pending { display: inline-block; background: #fef3c7; color: #d97706; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 10px; font-weight: 700; }
    .party p { font-size: 14px; color: #374151; margin-bottom: 4px; }
    .party .name { font-size: 17px; font-weight: 700; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    thead tr { background: #f3f4f6; }
    th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; }
    td { padding: 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    td.amount { text-align: right; font-weight: 600; }
    .summary { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .summary-box { width: 280px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #f3f4f6; }
    .summary-row.total { border-top: 2px solid #111827; border-bottom: none; padding-top: 16px; margin-top: 8px; font-size: 20px; font-weight: 800; color: #111827; }
    .summary-row.discount { color: #10b981; }
    .payment-info { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 32px; }
    .payment-info h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 12px; font-weight: 700; }
    .payment-info p { font-size: 13px; color: #374151; margin-bottom: 6px; }
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px; }
    .footer strong { color: #6366f1; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="brand">
      <h1>SVK Cyber</h1>
      <p>E-Commerce Administration Platform</p>
      <p>support@svkcyber.com</p>
    </div>
    <div class="invoice-meta">
      <div class="invoice-label">Invoice</div>
      <p><strong>Invoice #:</strong> ${inv.invoice_number || `INV-${inv.id}`}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
      <p><strong>Order ID:</strong> ${inv.razorpay_order_id || 'N/A'}</p>
      <span class="${inv.status === 'paid' ? 'badge-paid' : 'badge-pending'}">${inv.status || 'pending'}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p class="name">SVK Cyber Technology</p>
      <p>E-Commerce SaaS Platform</p>
      <p>Chennai, Tamil Nadu, India</p>
      <p>GSTIN: PENDING</p>
    </div>
    <div class="party">
      <h3>Billed To</h3>
      <p class="name">${customer.name || customer.company || 'Valued Customer'}</p>
      ${customer.email ? `<p>${customer.email}</p>` : ''}
      ${customer.phone ? `<p>${customer.phone}</p>` : ''}
      ${customer.company ? `<p>${customer.company}</p>` : ''}
      ${customer.gstin ? `<p>GSTIN: ${customer.gstin}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>Billing Cycle</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>${plan.name || 'Subscription Plan'}</strong><br><small style="color:#6b7280">Software as a Service (SaaS) — Subscription</small></td>
        <td style="text-transform:capitalize">${billingCycle}</td>
        <td class="amount">${fmt(subtotal + discount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-box">
      <div class="summary-row"><span>Subtotal</span><span>${fmt(subtotal + discount)}</span></div>
      ${discount > 0 ? `<div class="summary-row discount"><span>Discount (${inv.coupon_applied?.code || 'Promo'})</span><span>-${fmt(discount)}</span></div>` : ''}
      ${gst > 0 ? `<div class="summary-row"><span>GST (18%)</span><span>${fmt(gst)}</span></div>` : ''}
      <div class="summary-row total"><span>Total Paid</span><span>${fmt(amount)}</span></div>
    </div>
  </div>

  ${inv.razorpay_payment_id ? `
  <div class="payment-info">
    <h3>Payment Details</h3>
    <p><strong>Payment ID:</strong> ${inv.razorpay_payment_id}</p>
    <p><strong>Order ID:</strong> ${inv.razorpay_order_id || 'N/A'}</p>
    <p><strong>Method:</strong> Razorpay — Online Payment</p>
    <p><strong>Status:</strong> ${(inv.status || 'pending').toUpperCase()}</p>
  </div>` : ''}

  <div class="footer">
    <p>Thank you for subscribing to <strong>SVK Cyber E-Commerce Platform</strong>!</p>
    <p style="margin-top:8px">Questions? Email us at support@svkcyber.com</p>
  </div>
</div>
</body>
</html>`;
  }
}
