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
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Subscription } from 'rxjs';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-stocks',
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
  templateUrl: './stocks.html',
  styleUrl: './stocks.scss',
})
export class Stocks implements OnInit, OnDestroy {
  products: any[] = [];
  stockLogs: any[] = [];

  productColumns = [
    { columnDef: 'name', header: 'Product Name' },
    { columnDef: 'stock', header: 'Current Stock', type: 'custom' },
    { columnDef: 'price', header: 'Price ($)', type: 'currency', format: 'USD' },
    { columnDef: 'low_threshold', header: 'Low Threshold', type: 'custom' },
    { columnDef: 'critical_threshold', header: 'Critical Threshold', type: 'custom' }
  ];

  logColumns = [
    { columnDef: 'product_name', header: 'Product' },
    { columnDef: 'old_stock', header: 'Old Stock' },
    { columnDef: 'added_stock', header: 'Adjusted Qty', type: 'custom' },
    { columnDef: 'new_stock', header: 'New Stock' },
    { columnDef: 'action', header: 'Type', type: 'custom' },
    { columnDef: 'status', header: 'Status', type: 'badge' },
    { columnDef: 'created_at', header: 'Timestamp' },
    { columnDef: 'actions', header: 'Review', type: 'custom' }
  ];

  stockForm: FormGroup;
  showForm = false;
  viewMode: 'products' | 'logs' = 'products';
  loading = false;
  private socketSub = new Subscription();

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    private authService: AuthService,
    private socketService: SocketService,
    public perm: PermissionService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.stockForm = this.fb.group({
      product_id: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      action: ['ADD', Validators.required]
    });
  }

  get isAdmin(): boolean {
    return this.authService.isSuperAdmin() || this.authService.getUserType() === 'Admin';
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  ngOnInit() {
    this.loadProducts();
    this.loadStockLogs();

    this.socketSub.add(
      this.socketService.on('stock-update').subscribe(() => {
        this.loadProducts();
        this.loadStockLogs();
      })
    );

    this.socketSub.add(
      this.route.queryParamMap.subscribe((params) => {
        const view = params.get('view');
        if ((view === 'products' || view === 'logs') && view !== this.viewMode) {
          this.changeView(view);
        }
        const wantsAdd = params.get('action') === 'add';
        if (wantsAdd && !this.showForm) {
          this.toggleForm();
        } else if (!wantsAdd && this.showForm) {
          this.toggleForm();
        }
        this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy() {
    this.socketSub.unsubscribe();
  }

  loadProducts() {
    this.loading = true;
    this.commonService.getApi('products').subscribe({
      next: (res: any) => {
        this.products = res?.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.loading = false;
      }
    });
  }

  loadStockLogs() {
    this.commonService.getApi('stock/logs').subscribe({
      next: (res: any) => {
        const rawLogs = res?.data || [];
        this.stockLogs = rawLogs.map((log: any) => {
          const prod = this.products.find(p => p.id === log.product_id);
          return {
            ...log,
            product_name: prod ? prod.name : `Product ID: ${log.product_id}`,
            created_at: log.created_at ? new Date(log.created_at).toLocaleString() : '-'
          };
        });
      },
      error: (err) => {
        console.error('Failed to load stock logs:', err);
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.stockForm.reset({ action: 'ADD' });
    }
  }

  changeView(mode: 'products' | 'logs') {
    this.viewMode = mode;
    if (mode === 'products') {
      this.loadProducts();
    } else {
      this.loadStockLogs();
    }
  }

  submitStockUpdate() {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.stockForm.value;

    this.commonService.postApi('stock/update', payload).subscribe({
      next: () => {
        this.alert.success("Stock adjustment request submitted successfully");
        this.toggleForm();
        this.loadProducts();
        this.loadStockLogs();
      },
      error: (err) => {
        console.error('Stock adjustment failed:', err);
        this.alert.error("Adjustment failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  approveAdjustment(id: number, action: 'APPROVE' | 'REJECT', reason?: string) {
    this.loading = true;
    this.commonService.putApi(`stock/logs/${id}/approve`, { action, rejection_reason: reason }).subscribe({
      next: () => {
        this.alert.success(`Adjustment ${action.toLowerCase()}d successfully`);
        this.loadProducts();
        this.loadStockLogs();
        this.loading = false;
      },
      error: (err) => {
        this.alert.error(err.error?.message || "Action failed");
        this.loading = false;
      }
    });
  }

  rejectAdjustment(id: number) {
    this.alert.prompt({
      title: 'Reject Stock Adjustment',
      label: 'Provide reason for rejection',
      placeholder: 'Enter reason...',
      validatorText: 'You must enter a reason!'
    }).then((inputResult: any) => {
      if (inputResult.isConfirmed) {
        this.approveAdjustment(id, 'REJECT', inputResult.value);
      }
    });
  }
}
