import { Component } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { TablerIconsModule } from 'angular-tabler-icons';

export interface WorkforceRequest {
  id: string;
  employeeName: string;
  type: string;
  date: string;
  status: string;
}

const REQUEST_DATA: WorkforceRequest[] = [
  { id: 'REQ-1021', employeeName: 'Sarah Jenkins', type: 'Leave', date: 'Oct 12 - Oct 15', status: 'Pending' },
  { id: 'REQ-1022', employeeName: 'Marcus Cole', type: 'Shift Swap', date: 'Oct 14', status: 'Approved' },
  { id: 'REQ-1023', employeeName: 'Elena Rodriguez', type: 'Overtime', date: 'Oct 10', status: 'Approved' },
  { id: 'REQ-1024', employeeName: 'David Kim', type: 'Leave', date: 'Nov 01 - Nov 05', status: 'Rejected' },
  { id: 'REQ-1025', employeeName: 'Aisha Patel', type: 'Equipment', date: 'Oct 11', status: 'Pending' },
];

@Component({
  selector: 'app-workforce-requests',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    TablerIconsModule
],
  templateUrl: './workforce-requests.html',
  styleUrl: './workforce-requests.scss',
})
export class WorkforceRequests {
  displayedColumns: string[] = ['id', 'employeeName', 'type', 'date', 'status', 'actions'];
  dataSource = REQUEST_DATA;

  getStatusColor(status: string): string {
    switch (status) {
      case 'Approved': return 'bg-light-success text-success';
      case 'Pending': return 'bg-light-warning text-warning';
      case 'Rejected': return 'bg-light-error text-error';
      default: return 'bg-light-primary text-primary';
    }
  }
}
