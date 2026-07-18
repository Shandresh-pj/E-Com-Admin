import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { CommonService } from '../../Securities/Services/common.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-billing-history',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './billing-history.html',
  styleUrls: ['./billing-history.scss']
})
export class BillingHistoryComponent implements OnInit {
  invoices = signal<any[]>([]);
  isLoading = signal(false);
  
  selectedInvoice = signal<any>(null);
  @ViewChild('invoicePdf') invoicePdf!: ElementRef;

  constructor(
    private commonService: CommonService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.fetchInvoices();
  }

  fetchInvoices() {
    this.isLoading.set(true);
    this.commonService.getApi('subscription-invoices').subscribe({
      next: (res: any) => {
        if (res.success) {
          this.invoices.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to load billing history', 'Close', { duration: 3000 });
      }
    });
  }

  viewInvoice(invoice: any) {
    this.selectedInvoice.set(invoice);
  }

  closeInvoice() {
    this.selectedInvoice.set(null);
  }

  async downloadPDF() {
    if (!this.invoicePdf) return;
    
    this.snackBar.open('Generating PDF...', 'Close', { duration: 2000 });
    
    try {
      const element = this.invoicePdf.nativeElement;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${this.selectedInvoice().invoice_number || this.selectedInvoice().id}.pdf`);
    } catch (error) {
      this.snackBar.open('Error generating PDF', 'Close', { duration: 3000 });
    }
  }

  printInvoice() {
    window.print();
  }
}
