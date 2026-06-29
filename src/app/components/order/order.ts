import { ChangeDetectorRef, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatTable
  ],
  templateUrl: './order.html',
  styleUrl: './order.scss',
})
export class Order {
  tableColumns = [
    { columnDef: 'id', header: 'No' },
    { columnDef: 'invoice_no', header: 'Invoice No' },
    { columnDef: 'status', header: 'Status' },
    { columnDef: 'payment_status', header: 'Payment Status' },
    { columnDef: 'total', header: 'Total' },
    { columnDef: 'created_at', header: 'Created At' },
  ];

  Orders: any;
  OrderDetail_View: boolean = false;
  SelectedOrder: any;

  constructor(
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.getOrders();
  }

  getOrders() {
    this.commonService.getApi(`orders`).subscribe({
      next: (res: any) => {
        this.Orders = res?.data;
        this.cdr.detectChanges();
      }
    });
  }

  viewOrder(order: any) {
    this.SelectedOrder = order;
    this.OrderDetail_View = true;
  }

  deleteOrder(order: any) {
    this.commonService.deleteApi(`orders/${order?.id}`).subscribe({
      next: (res: any) => {
        this.alert.success("Order deleted successfully");
        this.getOrders();
      }
    });
  }

  closeOrderDetail() {
    this.OrderDetail_View = false;
    this.SelectedOrder = null;
  }
}
