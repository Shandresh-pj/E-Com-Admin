import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environment/environment';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { SubscriptionService } from 'src/app/services/subscription.service';

export interface LeadContact {
  id: number;
  companyName: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  businessType: string;
  gst: string | null;
  website: string | null;
  employeeCount: number;
  preferredPlan: string;
  billingCycle: string;
  message: string | null;
  status: string;
  emailVerified: boolean;
  isDeleted: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-crm-contacts',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatTable],
  templateUrl: './crm-contacts.html',
  styleUrls: ['./crm-contacts.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CrmContacts implements OnInit {
  leads: LeadContact[] = [];
  
  tableColumns = [
    { columnDef: 'company', header: 'Company Name', type: 'custom' },
    { columnDef: 'ownerName', header: 'Owner Name' },
    { columnDef: 'email', header: 'Contact Email', type: 'custom' },
    { columnDef: 'phone', header: 'Phone' },
    { columnDef: 'plan', header: 'Preferred Plan', type: 'custom' },
    { columnDef: 'billingCycle', header: 'Billing Cycle' },
    { columnDef: 'status', header: 'Status', type: 'badge' },
    { columnDef: 'createdAt', header: 'Date Registered', type: 'date', format: 'dd MMM yyyy, HH:mm' },
    { columnDef: 'crm_actions', header: 'Actions', type: 'custom' }
  ];

  stats = { total: 0, pending: 0, approved: 0, rejected: 0, converted: 0 };

  // Filters & Pagination state
  searchQuery = '';
  statusFilter = '';
  planFilter = '';
  showDeleted = false;
  sortBy = 'createdAt';
  sortOrder = 'DESC';

  page = 1;
  limit = 10;
  totalLeads = 0;
  totalPages = 1;

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Bulk action selection
  selectedIds = new Set<number>();
  
  filterPlans: string[] = ['14-Day Free Trial'];

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef,
    private subscriptionService: SubscriptionService
  ) { }

  ngOnInit() {
    this.subscriptionService.getPlans().subscribe(plans => {
      this.filterPlans = ['14-Day Free Trial', ...plans.map(p => p.name)];
      this.cdr.markForCheck();
    });
    this.fetchLeads();
  }

  getHeaders() {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  onSelectionChange(selectedRows: any[]) {
    this.selectedIds.clear();
    selectedRows.forEach(row => this.selectedIds.add(row.id));
  }

  fetchLeads(silent: boolean = false) {
    if (!silent) {
      this.isLoading = true;
    }
    this.errorMessage = '';

    const params: any = {
      page: this.page.toString(),
      limit: this.limit.toString(),
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      showDeleted: this.showDeleted.toString()
    };

    if (this.statusFilter) params.status = this.statusFilter;
    if (this.planFilter) params.preferredPlan = this.planFilter;

    // Use built-in MatTable search if needed, but since server side might be requested:
    // Actually the HTML template removed the search input from CRM panel and uses the MatTable's internal one... wait!
    // The previous CRM HTML had a search box. I replaced it with `[showSearch]="true"` on `<app-mat-table>`. 
    // `app-mat-table` handles client side search. But since this was doing server-side pagination, maybe we want to keep it?
    // Wait, the mat-table handles client-side filtering via MatTableDataSource. Let's let it handle client-side search for the loaded page for now.

    const queryStr = new URLSearchParams(params).toString();

    this.http.get(`${environment.apiUrl}/contacts?${queryStr}`, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.leads = res.data;
        this.totalLeads = res.total;
        this.totalPages = res.totalPages;
        this.stats = res.stats;
        this.isLoading = false;
        if (!silent) {
          this.selectedIds.clear();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load lead contacts.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange() {
    this.page = 1;
    this.fetchLeads();
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.fetchLeads();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.fetchLeads();
    }
  }

  // Actions
  approveLead(id: number) {
    const leadIndex = this.leads.findIndex(l => l.id === id);
    let originalStatus = '';
    if (leadIndex !== -1) {
      originalStatus = this.leads[leadIndex].status;
      this.leads[leadIndex].status = 'APPROVED';
      this.leads = [...this.leads];
      this.showToast('Lead marked as approved. Sending password setup email...');
    }

    this.http.post(`${environment.apiUrl}/contacts/${id}/approve`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => this.fetchLeads(true),
      error: (err) => {
        if (leadIndex !== -1) {
          this.leads[leadIndex].status = originalStatus;
          this.leads = [...this.leads];
        }
        this.errorMessage = err.error?.message || 'Failed to approve lead.';
      }
    });
  }

  rejectLead(id: number) {
    const leadIndex = this.leads.findIndex(l => l.id === id);
    let originalStatus = '';
    if (leadIndex !== -1) {
      originalStatus = this.leads[leadIndex].status;
      this.leads[leadIndex].status = 'REJECTED';
      this.leads = [...this.leads];
      this.showToast('Lead marked as rejected.');
    }

    this.http.post(`${environment.apiUrl}/contacts/${id}/reject`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => this.fetchLeads(true),
      error: (err) => {
        if (leadIndex !== -1) {
          this.leads[leadIndex].status = originalStatus;
          this.leads = [...this.leads];
        }
        this.errorMessage = err.error?.message || 'Failed to reject lead.';
      }
    });
  }

  deleteLead(id: number) {
    const originalLeads = [...this.leads];
    this.leads = this.leads.filter(l => l.id !== id);
    this.showToast('Lead contact soft deleted successfully.');

    this.http.delete(`${environment.apiUrl}/contacts/${id}`, { headers: this.getHeaders() }).subscribe({
      next: () => this.fetchLeads(true),
      error: (err) => {
        this.leads = originalLeads;
        this.errorMessage = err.error?.message || 'Failed to delete lead.';
      }
    });
  }

  restoreLead(id: number) {
    this.http.post(`${environment.apiUrl}/contacts/${id}/restore`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.showToast('Lead contact restored successfully.');
        this.fetchLeads(true);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to restore lead.';
      }
    });
  }

  // Bulk processing
  performBulkAction(action: 'approve' | 'reject' | 'delete') {
    if (this.selectedIds.size === 0) return;

    this.isLoading = true;
    const idsArray = Array.from(this.selectedIds);
    let completedCount = 0;

    const onComplete = () => {
      completedCount++;
      if (completedCount === idsArray.length) {
        this.isLoading = false;
        this.selectedIds.clear();
        this.showToast(`Bulk ${action} operation completed.`);
        this.fetchLeads(true);
      }
    };

    idsArray.forEach(id => {
      let reqUrl = '';
      let reqMethod = 'POST';

      if (action === 'approve') reqUrl = `${environment.apiUrl}/contacts/${id}/approve`;
      if (action === 'reject') reqUrl = `${environment.apiUrl}/contacts/${id}/reject`;
      if (action === 'delete') {
        reqUrl = `${environment.apiUrl}/contacts/${id}`;
        reqMethod = 'DELETE';
      }

      const request = reqMethod === 'POST'
        ? this.http.post(reqUrl, {}, { headers: this.getHeaders() })
        : this.http.delete(reqUrl, { headers: this.getHeaders() });

      request.subscribe({ next: onComplete, error: onComplete });
    });
  }

  // Export CSV / PDF
  exportData(format: 'csv' | 'pdf') {
    const params: any = { format, showDeleted: this.showDeleted.toString() };
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.planFilter) params.preferredPlan = this.planFilter;

    const queryStr = new URLSearchParams(params).toString();
    const exportUrl = `${environment.apiUrl}/contacts/export?${queryStr}`;

    this.http.get(exportUrl, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => this.errorMessage = 'Failed to export lead contacts data.'
    });
  }

  printData() {
    window.print();
  }

  showToast(message: string) {
    this.successMessage = message;
    this.cdr.markForCheck();
    setTimeout(() => {
      if (this.successMessage === message) this.successMessage = '';
      this.cdr.markForCheck();
    }, 4000);
  }
}
