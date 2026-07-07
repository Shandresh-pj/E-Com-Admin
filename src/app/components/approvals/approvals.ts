import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    MatTableModule,
    MatTooltipModule,
    MatPaginatorModule
  ],
  templateUrl: './approvals.html',
  styleUrl: './approvals.scss'
})
export class Approvals implements OnInit, OnDestroy {
  loading = false;
  requests: any[] = [];
  selectedRequest: any = null;

  // Pagination & Filtering
  totalRequests = 0;
  pageSize = 10;
  currentPage = 1;
  statusFilter = '';
  typeFilter = '';

  // Bulk Operations Selection
  selection = new SelectionModel<any>(true, []);
  bulkComment = '';
  isProcessingBulk = false;

  // Action states
  adminComment = '';
  isSavingAction = false;
  aiAuditReport = '';
  aiLoadingReport = false;

  isAdmin = false;
  isSuperAdmin = false;

  private socketSub!: Subscription;

  displayedColumns: string[] = [
    'select',
    'id',
    'action_type',
    'status',
    'requested_by',
    'requested_date',
    'branch',
    'actions'
  ];

  constructor(
    private commonService: CommonService,
    private authService: AuthService,
    public perm: PermissionService,
    private alert: AlertService,
    private socket: SocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isSuperAdmin() || this.authService.getUserType() === 'Admin';
    this.isSuperAdmin = this.authService.isSuperAdmin();

    // If not admin, hide bulk select checkbox columns
    if (!this.isAdmin) {
      this.displayedColumns = this.displayedColumns.filter(c => c !== 'select');
    }

    this.loadRequests();
    this.setupRealtimeSocket();
  }

  ngOnDestroy() {
    if (this.socketSub) {
      this.socketSub.unsubscribe();
    }
  }

  loadRequests() {
    this.loading = true;
    this.selection.clear();
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };

    if (this.statusFilter) params.status = this.statusFilter;
    if (this.typeFilter) params.action_type = this.typeFilter;

    this.commonService.getApi('approvals', params).subscribe({
      next: (res: any) => {
        this.requests = res?.data || [];
        this.totalRequests = res?.meta?.total || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        this.alert.error('Failed to load approval requests');
        this.cdr.detectChanges();
      }
    });
  }

  setupRealtimeSocket() {
    this.socketSub = this.socket.on('approval-update').subscribe({
      next: (data: any) => {
        // If the updated request is the one currently in difference viewer, reload it
        if (this.selectedRequest && this.selectedRequest.id === data.id) {
          this.viewDetails(this.selectedRequest.id);
        }
        this.loadRequests();
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadRequests();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadRequests();
  }

  // ── Bulk Selection Helpers ───────────────────────────────────────────
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.requests.filter(r => r.status === 'Pending').length;
    return numSelected === numRows;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.requests.forEach(row => {
        if (row.status === 'Pending') {
          this.selection.select(row);
        }
      });
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────
  viewDetails(id: number) {
    this.loading = true;
    this.commonService.getApi(`approvals/${id}`).subscribe({
      next: (res: any) => {
        this.selectedRequest = res?.data;
        this.adminComment = this.selectedRequest?.approval_comment || '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.alert.error('Failed to fetch request details');
        this.cdr.detectChanges();
      }
    });
  }

  closeDetails() {
    this.selectedRequest = null;
    this.adminComment = '';
    this.aiAuditReport = '';
    this.aiLoadingReport = false;
    this.cdr.detectChanges();
  }

  submitAction(action: 'APPROVE' | 'REJECT' | 'CHANGES_REQUESTED' | 'CANCEL') {
    if (action !== 'CANCEL' && !this.isAdmin) {
      this.alert.warning('Only administrators can perform this action');
      return;
    }

    const confirmMsg = `Are you sure you want to ${action.toLowerCase().replace('_', ' ')} this request?`;
    if (!confirm(confirmMsg)) return;

    this.isSavingAction = true;
    this.cdr.detectChanges();

    this.commonService.postApi(`approvals/${this.selectedRequest.id}/action`, {
      action,
      comment: this.adminComment
    }).subscribe({
      next: (res: any) => {
        this.isSavingAction = false;
        this.alert.success(res.message || `Request ${action.toLowerCase()} successfully`);
        this.closeDetails();
        this.loadRequests();
      },
      error: (err: any) => {
        this.isSavingAction = false;
        const msg = err?.error?.message || 'Action processing failed';
        this.alert.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  submitBulkAction(action: 'APPROVE' | 'REJECT') {
    const selectedIds = this.selection.selected.map(r => r.id);
    if (selectedIds.length === 0) {
      this.alert.warning('No requests selected');
      return;
    }

    const confirmMsg = `Are you sure you want to bulk ${action.toLowerCase()} ${selectedIds.length} requests?`;
    if (!confirm(confirmMsg)) return;

    this.isProcessingBulk = true;
    this.cdr.detectChanges();

    this.commonService.postApi('approvals/bulk-action', {
      ids: selectedIds,
      action,
      comment: this.bulkComment
    }).subscribe({
      next: (res: any) => {
        this.isProcessingBulk = false;
        this.bulkComment = '';
        this.selection.clear();
        this.alert.success(res.message || 'Bulk processing completed');
        this.loadRequests();
      },
      error: (err: any) => {
        this.isProcessingBulk = false;
        const msg = err?.error?.message || 'Bulk operation failed';
        this.alert.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  // ── Difference viewer formatting helpers ─────────────────────────────
  getDiffFields(): string[] {
    if (!this.selectedRequest || !this.selectedRequest.new_values) return [];
    
    // Ignore meta fields when showing changes
    const ignoreList = ['registration_id', 'creator', 'created_at', 'updated_at', 'variants', 'attribute_values', 'images', 'image', 'video'];
    const keys = Object.keys(this.selectedRequest.new_values);
    return keys.filter(k => !ignoreList.includes(k));
  }

  isFieldChanged(field: string): boolean {
    if (!this.selectedRequest || !this.selectedRequest.previous_values) return true;
    const prev = this.selectedRequest.previous_values[field];
    const next = this.selectedRequest.new_values[field];
    return JSON.stringify(prev) !== JSON.stringify(next);
  }

  getPreviousValue(field: string): string {
    if (!this.selectedRequest || !this.selectedRequest.previous_values) return '-';
    const val = this.selectedRequest.previous_values[field];
    if (val === null || val === undefined) return '-';
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  }

  getNewValue(field: string): string {
    if (!this.selectedRequest || !this.selectedRequest.new_values) return '-';
    const val = this.selectedRequest.new_values[field];
    if (val === null || val === undefined) return '-';
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  }

  getUserId(): number {
    return this.authService.getUser()?.id || 0;
  }

  runAiAudit() {
    if (!this.selectedRequest) return;

    this.aiLoadingReport = true;
    this.aiAuditReport = '';
    this.cdr.detectChanges();

    this.commonService.postApi('ai/audit-product', { approval_id: this.selectedRequest.id }).subscribe({
      next: (res: any) => {
        this.aiLoadingReport = false;
        if (res.success && res.auditReport) {
          // Convert basic markdown tags to styled HTML structures
          let html = res.auditReport
            .replace(/### (.*)/g, '<h5 class="f-w-700 m-t-16 m-b-8 text-primary font-14">$1</h5>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/- (.*)/g, '<div class="d-flex align-items-start gap-8 m-b-4"><mat-icon class="icon-12 text-muted m-t-4">play_arrow</mat-icon><span>$1</span></div>')
            .replace(/\n/g, '<br>');
          this.aiAuditReport = html;
        } else {
          this.alert.error('Failed to generate AI Audit Report.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.aiLoadingReport = false;
        const msg = err?.error?.message || 'Failed to call Gemini AI.';
        this.alert.error(msg);
        this.cdr.detectChanges();
      }
    });
  }
}
