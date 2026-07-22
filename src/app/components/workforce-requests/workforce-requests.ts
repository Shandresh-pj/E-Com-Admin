import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';

export interface WorkforceRequest {
  id: string;
  employeeName: string;
  type: string;
  date: string;
  status: string;
}

@Component({
  selector: 'app-workforce-requests',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    TablerIconsModule,
    MatTable
  ],
  templateUrl: './workforce-requests.html',
  styleUrl: './workforce-requests.scss',
})
export class WorkforceRequests implements OnInit {
  tableColumns: TableColumn[] = [
    { columnDef: 'id', header: 'Request ID' },
    { columnDef: 'employeeName', header: 'Employee Name' },
    { columnDef: 'type', header: 'Type' },
    { columnDef: 'date', header: 'Date' },
    { columnDef: 'status', header: 'Status', type: 'badge' }
  ];
  
  dataSource: WorkforceRequest[] = [];
  loading = false;

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests() {
    this.loading = true;
    this.commonService.getApi('leave').subscribe({
      next: (res: any) => {
        const leaves = (res?.data || []).map((l: any) => ({
          id: `REQ-${l.id}`,
          employeeName: l.employee_name || l.employee?.name || `Employee #${l.employee_id}`,
          type: l.leave_type || 'Leave',
          date: l.date_range || `${l.from_date || l.start_date || ''} ${l.to_date || l.end_date ? 'to ' + (l.to_date || l.end_date) : ''}`.trim(),
          status: l.status || 'Pending',
          rawId: l.id
        }));
        this.dataSource = leaves;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.dataSource = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewRequest(row: any) {
    console.log('View', row);
  }

  deleteRequest(row: any) {
    if (row.rawId) {
      this.commonService.deleteApi(`leave/${row.rawId}`).subscribe({
        next: () => {
          this.alert.success('Request deleted successfully');
          this.loadRequests();
        },
        error: (err: any) => {
          this.alert.error('Failed to delete request');
        }
      });
    } else {
      this.dataSource = this.dataSource.filter(d => d.id !== row.id);
      this.cdr.detectChanges();
    }
  }
}
