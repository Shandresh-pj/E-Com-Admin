import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { SessionService } from 'src/app/Securities/Services/session.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Subscription } from 'rxjs';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-branch-stocks',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTable
  ],
  templateUrl: './branch-stocks.html',
  styleUrl: './branch-stocks.scss',
})
export class BranchStocks implements OnInit, OnDestroy {
  inventoryColumns: TableColumn[] = [
    { columnDef: 'branch_name', header: 'Branch Name' },
    { columnDef: 'product_name', header: 'Product' },
    { columnDef: 'stock', header: 'Stock Level' },
    { columnDef: 'updated_at', header: 'Last Updated' }
  ];

  transferColumns: TableColumn[] = [
    { columnDef: 'product_name', header: 'Product' },
    { columnDef: 'from_branch', header: 'From Branch' },
    { columnDef: 'to_branch', header: 'To Branch' },
    { columnDef: 'quantity', header: 'Quantity' },
    { columnDef: 'status', header: 'Status', type: 'badge' },
    { columnDef: 'created_at', header: 'Requested At', type: 'custom' },
    { columnDef: 'actions', header: 'Review', type: 'custom' }
  ];

  branchStocks: any[] = [];
  transfers: any[] = [];
  companies: any[] = [];
  branches: any[] = [];
  products: any[] = [];

  get totalBranchStocksCount(): number { return (this.branchStocks || []).length; }
  get activeBranchesCount(): number { return (this.branches || []).length; }
  get pendingTransfersCount(): number { return (this.transfers || []).filter(t => t.status === 'Pending Approval').length; }
  get approvedTransfersCount(): number { return (this.transfers || []).filter(t => t.status === 'Approved').length; }
  
  stockForm: FormGroup;
  transferForm: FormGroup;
  showForm = false;
  showTransferForm = false;
  viewMode: 'inventory' | 'transfers' = 'inventory';
  loading = false;
  private socketSub = new Subscription();

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    private authService: AuthService,
    private sessionService: SessionService,
    private socketService: SocketService,
    public perm: PermissionService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.stockForm = this.fb.group({
      company_id: ['', Validators.required],
      branch_name: ['', Validators.required],
      product_id: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      action: ['ADD', Validators.required]
    });

    this.transferForm = this.fb.group({
      from_branch: ['', Validators.required],
      to_branch: ['', Validators.required],
      product_id: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]]
    });
  }

  get isAdmin(): boolean {
    return this.authService.isSuperAdmin() ||
           this.perm.hasRoleAction('canManage', '/branch-stocks') ||
           this.perm.hasRoleAction('canUpdate', '/branch-stocks') ||
           this.perm.hasRoleAction('canApprove', '/branch-stocks');
  }

  ngOnInit() {
    this.loadBranchStocks();
    this.loadLookups();
    this.loadTransfers();

    // Setup Socket Listeners
    this.socketSub.add(
      this.socketService.on('branch-stock-update').subscribe(() => {
        this.loadBranchStocks();
      })
    );

    this.socketSub.add(
      this.socketService.on('branch-transfer-update').subscribe(() => {
        this.loadTransfers();
        this.loadBranchStocks();
      })
    );

    this.socketSub.add(
      this.route.queryParamMap.subscribe((params) => {
        const view = params.get('view');
        if ((view === 'inventory' || view === 'transfers') && view !== this.viewMode) {
          this.changeView(view);
        }
        this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy() {
    this.socketSub.unsubscribe();
  }

  loadBranchStocks() {
    this.loading = true;
    this.commonService.getApi('branch-stock').subscribe({
      next: (res: any) => {
        const rawList = res?.data?.data ?? res?.data ?? res;
        this.branchStocks = (Array.isArray(rawList) ? rawList : []).map((item: any) => ({
          ...item,
          product_name: item.product?.name || `Product ID: ${item.product_id}`,
          updated_at: item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load branch stocks:', err);
        this.branchStocks = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTransfers() {
    this.commonService.getApi('branch-stock/transfers').subscribe({
      next: (res: any) => {
        const rawList = res?.data?.data ?? res?.data ?? res;
        this.transfers = (Array.isArray(rawList) ? rawList : []).map((t: any) => ({
          ...t,
          product_name: t.product?.name || `Product ID: ${t.product_id}`
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load transfers:', err);
        this.transfers = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadLookups() {
    const userCompanyId = this.sessionService.getUser()?.company_id || this.sessionService.getUser()?.companyId;

    this.commonService.getApi('companies').subscribe({
      next: (res: any) => {
        const rawList = res?.data?.data ?? res?.data ?? res;
        this.companies = Array.isArray(rawList) ? rawList : [];
        if (this.companies.length > 0 && !this.stockForm.get('company_id')?.value) {
          const matchedCompany = this.companies.find(c => Number(c.id) === Number(userCompanyId)) || this.companies[0];
          if (matchedCompany) {
            this.stockForm.patchValue({ company_id: matchedCompany.id });
          }
        }
        this.cdr.detectChanges();
      }
    });

    this.commonService.getApi('branches').subscribe({
      next: (res: any) => {
        const rawList = res?.data?.data ?? res?.data ?? res;
        this.branches = Array.isArray(rawList) ? rawList : [];
        this.cdr.detectChanges();
      }
    });

    this.commonService.getApi('products').subscribe({
      next: (res: any) => {
        const rawList = res?.data?.data ?? res?.data ?? res;
        this.products = Array.isArray(rawList) ? rawList : [];
        this.cdr.detectChanges();
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
      this.showTransferForm = false;
      const userCompanyId = this.sessionService.getUser()?.company_id || this.sessionService.getUser()?.companyId || (this.companies[0]?.id || 1);
      this.stockForm.patchValue({ company_id: Number(userCompanyId), action: 'ADD' });
    } else {
      this.stockForm.reset({ action: 'ADD' });
    }
  }

  toggleTransferForm() {
    this.showTransferForm = !this.showTransferForm;
    if (this.showTransferForm) {
      this.showForm = false;
    } else {
      this.transferForm.reset();
    }
  }

  changeView(mode: 'inventory' | 'transfers') {
    this.viewMode = mode;
    if (mode === 'inventory') {
      this.loadBranchStocks();
    } else {
      this.loadTransfers();
    }
  }

  submitStockUpdate() {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formVal = this.stockForm.value;
    const payload = {
      company_id: Number(formVal.company_id),
      branch_name: String(formVal.branch_name),
      product_id: Number(formVal.product_id),
      quantity: Number(formVal.quantity),
      action: formVal.action || 'ADD'
    };

    this.commonService.postApi('branch-stock/update', payload).subscribe({
      next: (res: any) => {
        this.alert.success(res?.message || "Branch stock level adjustment submitted");
        this.toggleForm();
        this.loadBranchStocks();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Stock update failed:', err);
        this.alert.error("Adjustment failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  submitTransferRequest() {
    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }

    const formVal = this.transferForm.value;
    if (formVal.from_branch === formVal.to_branch) {
      this.alert.error("Source (From) and Destination (To) branch cannot be the same!");
      return;
    }

    this.loading = true;
    const payload = {
      from_branch: String(formVal.from_branch),
      to_branch: String(formVal.to_branch),
      product_id: Number(formVal.product_id),
      quantity: Number(formVal.quantity)
    };

    this.commonService.postApi('branch-stock/transfer', payload).subscribe({
      next: (res: any) => {
        this.alert.success(res?.message || "Inter-branch stock transfer requested");
        this.toggleTransferForm();
        this.loadTransfers();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Transfer request failed:', err);
        this.alert.error("Transfer failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  approveTransfer(id: number, action: 'APPROVE' | 'REJECT', reason?: string) {
    this.loading = true;
    this.commonService.putApi(`branch-stock/transfers/${id}/approve`, { action, rejection_reason: reason }).subscribe({
      next: (res: any) => {
        this.alert.success(res?.message || `Transfer ${action.toLowerCase()}d successfully`);
        this.loadTransfers();
        this.loadBranchStocks();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.alert.error(err.error?.message || "Action failed");
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  rejectTransfer(id: number) {
    this.alert.prompt({
      title: 'Reject Transfer Request',
      label: 'Provide reason for rejection',
      placeholder: 'Enter reason...',
      validatorText: 'You must enter a reason!'
    }).then((inputResult: any) => {
      if (inputResult.isConfirmed) {
        this.approveTransfer(id, 'REJECT', inputResult.value);
      }
    });
  }
}
