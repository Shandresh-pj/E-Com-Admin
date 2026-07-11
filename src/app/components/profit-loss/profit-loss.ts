import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TablerIconsModule } from 'angular-tabler-icons';
import { environment } from 'src/environment/environment';

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
    MatTableModule,
    MatDialogModule,
    MatSelectModule,
    HttpClientModule,
    TablerIconsModule
  ],
  templateUrl: './profit-loss.html',
  styleUrls: ['./profit-loss.scss']
})
export class ProfitLossComponent implements OnInit {
  displayedColumns: string[] = ['record_date', 'revenue', 'expenses', 'net_profit', 'entry_type', 'actions'];
  dataSource: ProfitLossRecord[] = [];
  isLoading = false;
  companyId = 1;

  showManualEntryModal = false;
  showAutoCalcModal = false;
  
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

  fetchRecords() {
    this.isLoading = true;
    this.http.get<{success: boolean, data: ProfitLossRecord[]}>(`${environment.apiUrl}/profit-loss?company_id=${this.companyId}`)
      .subscribe({
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

  deleteRecord(id: number) {
    if (confirm('Are you sure you want to delete this record?')) {
      this.http.delete(`${environment.apiUrl}/profit-loss/${id}`).subscribe({
        next: () => this.fetchRecords(),
        error: (err) => console.error(err)
      });
    }
  }

  submitManualEntry() {
    if (!this.manualForm.record_date || this.manualForm.revenue === null || this.manualForm.expenses === null) return;
    
    const payload = {
      ...this.manualForm,
      company_id: this.companyId,
      branch_id: 1
    };

    this.http.post(`${environment.apiUrl}/profit-loss`, payload).subscribe({
      next: () => {
        this.showManualEntryModal = false;
        this.resetForms();
        this.fetchRecords();
      },
      error: (err) => console.error(err)
    });
  }

  submitAutoCalc() {
    if (!this.autoCalcForm.start_date || !this.autoCalcForm.end_date) return;
    
    const payload = {
      company_id: this.companyId,
      start_date: this.autoCalcForm.start_date,
      end_date: this.autoCalcForm.end_date
    };

    this.http.post(`${environment.apiUrl}/profit-loss/auto-calculate`, payload).subscribe({
      next: () => {
        this.showAutoCalcModal = false;
        this.resetForms();
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
