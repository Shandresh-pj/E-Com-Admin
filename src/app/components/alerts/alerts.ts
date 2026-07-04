import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { TablerIconComponent } from "angular-tabler-icons";

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTable,
    TablerIconComponent
  ],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss',
})
export class Alerts implements OnInit {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'product_name', header: 'Product Name' },
    { columnDef: 'current_stock', header: 'Current Stock' },
    { columnDef: 'threshold', header: 'Threshold Limit' },
    { columnDef: 'created_at', header: 'Triggered Date' }
  ];

  alerts: any[] = [];
  loading = false;
  totalAlerts = 0;
  criticalAlertsCount = 0;

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService
  ) { }

  ngOnInit() {
    this.loadAlerts();
  }

  loadAlerts() {
    this.loading = true;
    this.commonService.getApi('alerts').subscribe({
      next: (res: any) => {
        this.alerts = (res?.data || []).map((item: any) => ({
          ...item,
          created_at: item.created_at ? new Date(item.created_at).toLocaleString() : '-'
        }));
        this.totalAlerts = this.alerts.length;
        this.criticalAlertsCount = this.alerts.filter(x => x.current_stock === 0).length;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load alerts:', err);
        this.loading = false;
      }
    });
  }

  deleteAlert(alertItem: any) {
    this.alert.confirm("Are you sure you want to dismiss this stock alert?").then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`alerts/${alertItem.id}`).subscribe({
          next: () => {
            this.alert.success("Alert dismissed successfully");
            this.loadAlerts();
          },
          error: (err: any) => {
            console.error('Failed to dismiss alert:', err);
            this.alert.error("Failed to dismiss alert");
          }
        });
      }
    });
  }
}
