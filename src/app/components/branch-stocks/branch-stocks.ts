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
export class BranchStocks implements OnInit {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'branch_name', header: 'Branch Name' },
    { columnDef: 'product_name', header: 'Product' },
    { columnDef: 'stock', header: 'Stock Level' },
    { columnDef: 'updated_at', header: 'Last Updated' }
  ];

  branchStocks: any[] = [];
  companies: any[] = [];
  branches: any[] = [];
  products: any[] = [];
  
  stockForm: FormGroup;
  showForm = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService
  ) {
    this.stockForm = this.fb.group({
      company_id: ['', Validators.required],
      branch_name: ['', Validators.required],
      product_id: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      action: ['ADD', Validators.required]
    });
  }

  ngOnInit() {
    this.loadBranchStocks();
    this.loadLookups();
  }

  loadBranchStocks() {
    this.loading = true;
    this.commonService.getApi('branch-stock').subscribe({
      next: (res: any) => {
        this.branchStocks = (res?.data || []).map((item: any) => ({
          ...item,
          product_name: item.product?.name || `Product ID: ${item.product_id}`,
          updated_at: item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load branch stocks:', err);
        this.loading = false;
      }
    });
  }

  loadLookups() {
    this.commonService.getApi('companies').subscribe({
      next: (res: any) => { this.companies = res?.data || []; }
    });

    this.commonService.getApi('branches').subscribe({
      next: (res: any) => { this.branches = res?.data || []; }
    });

    this.commonService.getApi('products').subscribe({
      next: (res: any) => { this.products = res?.data || []; }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.stockForm.reset({ action: 'ADD' });
    }
  }

  submitStockUpdate() {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.stockForm.value;

    this.commonService.postApi('branch-stock/update', payload).subscribe({
      next: () => {
        this.alert.success("Branch stock updated successfully");
        this.toggleForm();
        this.loadBranchStocks();
      },
      error: (err) => {
        console.error('Stock update failed:', err);
        this.alert.error("Stock update failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }
}
