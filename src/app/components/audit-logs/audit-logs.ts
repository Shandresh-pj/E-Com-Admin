import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule, DatePipe } from '@angular/common';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    MatTable
  ],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.scss'
})
export class AuditLogs implements OnInit {

  tableColumns = [
    { columnDef: 'id',         header: 'No'       },
    { columnDef: 'module',     header: 'Module'   },
    { columnDef: 'actionType', header: 'Action'   },
    { columnDef: 'userId',     header: 'User ID'  },
    { columnDef: 'ip',         header: 'IP'       },
    { columnDef: 'createdAt',  header: 'Date'     },
  ];

  logs: any[] = [];

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    public perm: PermissionService
  ) {}

  ngOnInit() {
    this.getLogs();
  }

  getLogs() {
    this.commonService.getApi('audit').subscribe({
      next: (res: any) => {
        this.logs = (res?.data || []).map((l: any) => ({ ...l, actionType: l.action }));
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Audit logs error:', err);
      }
    });
  }

  deleteLog(log: any) {
    this.alert.confirm('Delete this audit log?').then(result => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`audit/${log.id}`).subscribe({
          next: () => {
            this.alert.success('Audit log deleted');
            this.getLogs();
          }
        });
      }
    });
  }
}
