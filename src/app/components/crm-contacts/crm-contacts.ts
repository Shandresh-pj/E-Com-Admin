import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environment/environment';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [CommonModule, RouterModule, FormsModule, MatTableModule, MatCheckboxModule, MatSortModule, MatIconModule],
  templateUrl: './crm-contacts.html',
  styleUrls: ['./crm-contacts.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CrmContacts implements OnInit {
  leads: LeadContact[] = [];
  displayedColumns: string[] = ['select', 'company', 'owner', 'email', 'phone', 'plan', 'billing', 'status', 'date', 'actions'];
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

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.fetchLeads();
  }

  getHeaders() {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
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

    if (this.searchQuery) params.search = this.searchQuery;
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.planFilter) params.preferredPlan = this.planFilter;

    // Convert params to query string
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

  toggleSort(field: string) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = field;
      this.sortOrder = 'DESC';
    }
    this.fetchLeads();
  }

  sortData(sort: Sort) {
    if (!sort.active || sort.direction === '') {
      this.sortBy = 'createdAt';
      this.sortOrder = 'DESC';
    } else {
      this.sortBy = sort.active;
      this.sortOrder = sort.direction.toUpperCase();
    }
    this.fetchLeads();
  }

  // Bulk actions selection
  toggleSelectAll(event: any) {
    const isChecked = event.checked !== undefined ? event.checked : event.target.checked;
    if (isChecked) {
      this.leads.forEach(l => this.selectedIds.add(l.id));
    } else {
      this.selectedIds.clear();
    }
  }

  toggleSelect(id: number) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  // Actions
  approveLead(id: number) {
    // Optimistic UI updates
    const leadIndex = this.leads.findIndex(l => l.id === id);
    let originalStatus = '';
    if (leadIndex !== -1) {
      originalStatus = this.leads[leadIndex].status;
      this.leads[leadIndex].status = 'APPROVED';
      this.leads = [...this.leads];
      this.showToast('Lead marked as approved. Sending password setup email...');
    }

    this.http.post(`${environment.apiUrl}/contacts/${id}/approve`, {}, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.fetchLeads(true);
      },
      error: (err) => {
        // Rollback
        if (leadIndex !== -1) {
          this.leads[leadIndex].status = originalStatus;
          this.leads = [...this.leads];
        }
        this.errorMessage = err.error?.message || 'Failed to approve lead.';
      }
    });
  }

  rejectLead(id: number) {
    // Optimistic UI
    const leadIndex = this.leads.findIndex(l => l.id === id);
    let originalStatus = '';
    if (leadIndex !== -1) {
      originalStatus = this.leads[leadIndex].status;
      this.leads[leadIndex].status = 'REJECTED';
      this.leads = [...this.leads];
      this.showToast('Lead marked as rejected.');
    }

    this.http.post(`${environment.apiUrl}/contacts/${id}/reject`, {}, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.fetchLeads(true);
      },
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
    // Optimistic UI
    const originalLeads = [...this.leads];
    this.leads = this.leads.filter(l => l.id !== id);
    this.showToast('Lead contact soft deleted successfully.');

    this.http.delete(`${environment.apiUrl}/contacts/${id}`, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.fetchLeads(true);
      },
      error: (err) => {
        this.leads = originalLeads;
        this.errorMessage = err.error?.message || 'Failed to delete lead.';
      }
    });
  }

  restoreLead(id: number) {
    this.http.post(`${environment.apiUrl}/contacts/${id}/restore`, {}, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
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

      request.subscribe({
        next: onComplete,
        error: onComplete
      });
    });
  }

  // Export CSV / PDF
  exportData(format: 'csv' | 'pdf') {
    const params: any = {
      format,
      showDeleted: this.showDeleted.toString()
    };
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.planFilter) params.preferredPlan = this.planFilter;
    if (this.searchQuery) params.search = this.searchQuery;

    const queryStr = new URLSearchParams(params).toString();
    const exportUrl = `${environment.apiUrl}/contacts/export?${queryStr}`;

    // Standard download workflow via native window open or anchor click with Authorization header
    this.http.get(exportUrl, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).subscribe({
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
      error: (err) => {
        this.errorMessage = 'Failed to export lead contacts data.';
      }
    });
  }

  // Print Table
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
