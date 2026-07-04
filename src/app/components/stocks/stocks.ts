import { Component, OnInit } from '@angular/core';
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
import { MatTable } from 'src/utils/mat-table/mat-table';

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
export class Stocks implements OnInit {
  productColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'name', header: 'Product Name' },
    { columnDef: 'stock', header: 'Current Stock' },
    { columnDef: 'price', header: 'Price ($)' }
  ];

  logColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'product_name', header: 'Product' },
    { columnDef: 'old_stock', header: 'Old Stock' },
    { columnDef: 'added_stock', header: 'Adjusted Qty' },
    { columnDef: 'new_stock', header: 'New Stock' },
    { columnDef: 'action', header: 'Action' },
    { columnDef: 'created_at', header: 'Timestamp' }
  ];

  products: any[] = [];
  stockLogs: any[] = [];
  
  stockForm: FormGroup;
  showForm = false;
  viewMode: 'products' | 'logs' = 'products';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService
  ) {
    this.stockForm = this.fb.group({
      product_id: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      action: ['ADD', Validators.required]
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadStockLogs();
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
        this.alert.success("Global stock updated successfully");
        this.toggleForm();
        this.loadProducts();
        this.loadStockLogs();
      },
      error: (err) => {
        console.error('Global stock update failed:', err);
        this.alert.error("Stock update failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }
}
