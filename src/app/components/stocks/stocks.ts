import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Subscription } from 'rxjs';

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
    MatTableModule
  ],
  templateUrl: './stocks.html',
  styleUrl: './stocks.scss',
})
export class Stocks implements OnInit, OnDestroy {
  products: any[] = [];
  stockLogs: any[] = [];
  
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
    public perm: PermissionService
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
    const Swal = (window as any).Swal;
    if (Swal) {
      Swal.fire({
        title: 'Reject Stock Adjustment',
        input: 'text',
        inputLabel: 'Provide reason for rejection',
        inputPlaceholder: 'Enter reason...',
        showCancelButton: true,
        inputValidator: (value: string) => {
          if (!value) {
            return 'You must enter a reason!';
          }
          return null;
        }
      }).then((inputResult: any) => {
        if (inputResult.isConfirmed) {
          this.approveAdjustment(id, 'REJECT', inputResult.value);
        }
      });
    }
  }
}
