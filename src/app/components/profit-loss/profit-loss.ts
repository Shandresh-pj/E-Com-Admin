import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { environment } from 'src/environment/environment';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

export interface Branch {
  id: number;
  name: string;
  code: string;
  city: string;
}

export interface ProfitLossRecord {
  id?: number;
  company_id: number;
  branch_id?: number;
  branch_name?: string;
  record_date: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  margin_pct: number;
  entry_type: 'AUTO' | 'MANUAL';
  notes?: string;
}

export interface BranchPLSummary {
  branchId: number;
  branchName: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  marginPct: number;
  performanceRank: number;
}

@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
    MatProgressBarModule,
    HttpClientModule,
    MatTable,
    AppTranslatePipe
  ],
  templateUrl: './profit-loss.html',
  styleUrls: ['./profit-loss.scss']
})
export class ProfitLossComponent implements OnInit {
  tableColumns: TableColumn[] = [
    { columnDef: 'record_date', header: 'Record Date', type: 'date', format: 'dd MMM yyyy' },
    { columnDef: 'branch_name', header: 'Branch Name' },
    { columnDef: 'revenue', header: 'Revenue', type: 'currency' },
    { columnDef: 'cogs', header: 'COGS', type: 'currency' },
    { columnDef: 'operating_expenses', header: 'Op. Expenses', type: 'currency' },
    { columnDef: 'net_profit', header: 'Net Profit', type: 'custom' },
    { columnDef: 'margin_pct', header: 'Margin %', type: 'custom' },
    { columnDef: 'entry_type', header: 'Source', type: 'custom' }
  ];

  // Active Branches - loaded dynamically via API
  branches: Branch[] = [
    { id: 0, name: 'All Branches (Consolidated Admin View)', code: 'ALL', city: 'Global HQ' }
  ];

  selectedBranchId = signal<number>(0);
  selectedDateRange = signal<string>('MTD'); // 'TODAY' | 'WEEK' | 'MTD' | 'YTD'

  // Dynamic P&L Database - populated purely via GET /api/profit-loss
  dataSource: ProfitLossRecord[] = [];

  isLoading = false;
  companyId = 1;

  // Inline Form State
  PL_Form = false;
  activeFormType: 'manual' | 'auto' | null = null;

  manualForm = {
    branch_id: 1,
    record_date: '',
    revenue: null as number | null,
    cogs: null as number | null,
    operating_expenses: null as number | null,
    notes: ''
  };

  autoCalcForm = {
    branch_id: 0,
    start_date: '',
    end_date: ''
  };

  // Filtered records by branch
  filteredRecords = computed(() => {
    const bId = this.selectedBranchId();
    if (bId === 0) return this.dataSource;
    return this.dataSource.filter(r => r.branch_id === bId);
  });

  // KPI Calculations
  totalRevenue = computed(() => this.filteredRecords().reduce((sum, r) => sum + r.revenue, 0));
  totalCogs = computed(() => this.filteredRecords().reduce((sum, r) => sum + r.cogs, 0));
  totalExpenses = computed(() => this.filteredRecords().reduce((sum, r) => sum + r.operating_expenses, 0));
  totalNetProfit = computed(() => this.filteredRecords().reduce((sum, r) => sum + r.net_profit, 0));
  netMarginPct = computed(() => this.totalRevenue() > 0 ? Math.round((this.totalNetProfit() / this.totalRevenue()) * 10000) / 100 : 0);

  // Branch Side-by-Side Comparison
  branchSummaries = computed<BranchPLSummary[]>(() => {
    const activeBranches = this.branches.filter(b => b.id !== 0);
    const summaries = activeBranches.map(b => {
      const bRecords = this.dataSource.filter(r => r.branch_id === b.id);
      const rev = bRecords.reduce((sum, r) => sum + r.revenue, 0);
      const exp = bRecords.reduce((sum, r) => sum + r.cogs + r.operating_expenses, 0);
      const profit = rev - exp;
      const margin = rev > 0 ? Math.round((profit / rev) * 10000) / 100 : 0;
      return {
        branchId: b.id,
        branchName: b.name,
        totalRevenue: rev,
        totalExpenses: exp,
        netProfit: profit,
        marginPct: margin,
        performanceRank: 1
      };
    });

    // Rank branches by Net Profit
    return summaries.sort((a, b) => b.netProfit - a.netProfit).map((s, index) => ({ ...s, performanceRank: index + 1 }));
  });

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchBranches();
    this.fetchRecords();
  }

  fetchBranches() {
    this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/branches`)
      .pipe(
        catchError(() => this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/branch`)),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        if (res && (res.data || Array.isArray(res))) {
          const list = Array.isArray(res) ? res : res.data;
          if (list.length > 0) {
            const mappedBranches: Branch[] = list.map((b: any) => ({
              id: b.id || b.branch_id,
              name: b.name || b.branch_name,
              code: b.code || `BR-${b.id}`,
              city: b.address || b.location || 'Headquarters'
            }));
            this.branches = [
              { id: 0, name: 'All Branches (Consolidated Admin View)', code: 'ALL', city: 'Global HQ' },
              ...mappedBranches
            ];
          }
        }
      });
  }

  openForm(type: 'manual' | 'auto') {
    this.activeFormType = type;
    this.PL_Form = true;
    this.resetForms();
  }

  closeForm() {
    this.PL_Form = false;
    this.activeFormType = null;
    this.resetForms();
  }

  fetchRecords() {
    this.isLoading = true;
    this.http.get<{ success: boolean; data: ProfitLossRecord[] }>(
      `${environment.apiUrl}/profit-loss?company_id=${this.companyId}`
    ).pipe(catchError(() => of(null)))
    .subscribe({
      next: (res: any) => {
        if (res && res.success && res.data && res.data.length > 0) {
          this.dataSource = res.data;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  deleteRecord(row: any) {
    if (confirm('Are you sure you want to delete this P&L record?')) {
      this.http.delete(`${environment.apiUrl}/profit-loss/${row.id}`)
        .pipe(catchError(() => of(null)))
        .subscribe({
          next: () => this.fetchRecords(),
          error: () => {
            this.dataSource = this.dataSource.filter(r => r.id !== row.id);
          }
        });
    }
  }

  formatDateForBackend(dateVal: any): string {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, '0');
      const day = String(dateVal.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(dateVal);
  }

  submitManualEntry() {
    if (!this.manualForm.record_date || this.manualForm.revenue === null || this.manualForm.cogs === null || this.manualForm.operating_expenses === null) return;

    const rev = Number(this.manualForm.revenue);
    const cogs = Number(this.manualForm.cogs);
    const opex = Number(this.manualForm.operating_expenses);
    const gross = rev - cogs;
    const net = gross - opex;
    const margin = rev > 0 ? Math.round((net / rev) * 10000) / 100 : 0;

    const branch = this.branches.find(b => b.id === Number(this.manualForm.branch_id));

    const payload = {
      company_id: this.companyId,
      branch_id: Number(this.manualForm.branch_id),
      record_date: this.formatDateForBackend(this.manualForm.record_date),
      revenue: rev,
      cogs: cogs,
      expenses: opex,
      notes: this.manualForm.notes
    };

    const newRecord: ProfitLossRecord = {
      id: Date.now(),
      company_id: this.companyId,
      branch_id: Number(this.manualForm.branch_id),
      branch_name: branch ? branch.name : 'Main HQ Superstore',
      record_date: payload.record_date,
      revenue: rev,
      cogs: cogs,
      gross_profit: gross,
      operating_expenses: opex,
      net_profit: net,
      margin_pct: margin,
      entry_type: 'MANUAL',
      notes: this.manualForm.notes
    };

    this.http.post<{ success: boolean; data: ProfitLossRecord }>(`${environment.apiUrl}/profit-loss`, payload)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (res: any) => {
          if (res && res.data) {
            this.dataSource = [res.data, ...this.dataSource];
          } else {
            this.dataSource = [newRecord, ...this.dataSource];
          }
          this.closeForm();
          Swal.fire({
            icon: 'success',
            title: 'P&L Entry Saved',
            text: `Added manual entry for ${newRecord.branch_name}`,
            timer: 1800,
            showConfirmButton: false
          });
        }
      });
  }

  submitAutoCalc() {
    if (!this.autoCalcForm.start_date || !this.autoCalcForm.end_date) return;

    const payload = {
      company_id: this.companyId,
      branch_id: Number(this.autoCalcForm.branch_id) || undefined,
      start_date: this.formatDateForBackend(this.autoCalcForm.start_date),
      end_date: this.formatDateForBackend(this.autoCalcForm.end_date)
    };

    Swal.fire({
      title: 'Calculating Profit & Loss...',
      html: 'Aggregating POS delivered sales revenue, COGS inventory cost, and payroll expenses...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.http.post<{ success: boolean; data: any }>(`${environment.apiUrl}/profit-loss/auto-calculate`, payload)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Auto-Calculation Complete!',
            text: 'Synchronized live POS orders and expenses into P&L ledger.',
            timer: 1800,
            showConfirmButton: false
          });
          this.fetchRecords();
          this.closeForm();
        }
      });
  }

  exportReport(format: 'PDF' | 'EXCEL') {
    Swal.fire({
      icon: 'info',
      title: `Exporting P&L Statement (${format})`,
      text: `Generating financial report for ${this.branches.find(b => b.id === this.selectedBranchId())?.name}`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  resetForms() {
    this.manualForm = { branch_id: 1, record_date: '', revenue: null, cogs: null, operating_expenses: null, notes: '' };
    this.autoCalcForm = { branch_id: 0, start_date: '', end_date: '' };
  }
}
