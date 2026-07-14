import { Component, OnInit } from '@angular/core';
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
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { environment } from 'src/environment/environment';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';

export interface ProfitLossRecord {
  id?: number;
  company_id: number;
  record_date: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  entry_type: string;
  notes?: string;
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
    HttpClientModule,
    MatTable
  ],
  templateUrl: './profit-loss.html',
  styleUrls: ['./profit-loss.scss']
})
export class ProfitLossComponent implements OnInit {
  tableColumns: TableColumn[] = [
    { columnDef: 'record_date', header: 'Date', type: 'date', format: 'dd MMM yyyy' },
    { columnDef: 'revenue', header: 'Revenue', type: 'currency' },
    { columnDef: 'expenses', header: 'Expenses', type: 'currency' },
    { columnDef: 'net_profit', header: 'Net Profit', type: 'custom' },
    { columnDef: 'entry_type', header: 'Source', type: 'custom' },
    { columnDef: 'notes', header: 'Notes' }
  ];
  
  dataSource: ProfitLossRecord[] = [];
  isLoading = false;
  companyId = 1;

  // Inline form state
  PL_Form = false;
  activeFormType: 'manual' | 'auto' | null = null;

  manualForm = {
    record_date: '',
    revenue: null as number | null,
    expenses: null as number | null,
    notes: ''
  };

  autoCalcForm = {
    start_date: '',
    end_date: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchRecords();
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
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.dataSource = res.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch P&L', err);
        this.isLoading = false;
      }
    });
  }

  deleteRecord(row: any) {
    if (confirm('Are you sure you want to delete this record?')) {
      this.http.delete(`${environment.apiUrl}/profit-loss/${row.id}`).subscribe({
        next: () => this.fetchRecords(),
        error: (err) => console.error(err)
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
    if (!this.manualForm.record_date || this.manualForm.revenue === null || this.manualForm.expenses === null) return;

    const payload = {
      ...this.manualForm,
      record_date: this.formatDateForBackend(this.manualForm.record_date),
      company_id: this.companyId,
      branch_id: 1
    };

    this.http.post(`${environment.apiUrl}/profit-loss`, payload).subscribe({
      next: () => {
        this.closeForm();
        this.fetchRecords();
      },
      error: (err) => console.error(err)
    });
  }

  submitAutoCalc() {
    if (!this.autoCalcForm.start_date || !this.autoCalcForm.end_date) return;

    const payload = {
      company_id: this.companyId,
      start_date: this.formatDateForBackend(this.autoCalcForm.start_date),
      end_date: this.formatDateForBackend(this.autoCalcForm.end_date)
    };

    this.http.post(`${environment.apiUrl}/profit-loss/auto-calculate`, payload).subscribe({
      next: () => {
        this.closeForm();
        this.fetchRecords();
      },
      error: (err) => console.error(err)
    });
  }

  resetForms() {
    this.manualForm = { record_date: '', revenue: null, expenses: null, notes: '' };
    this.autoCalcForm = { start_date: '', end_date: '' };
  }
}
