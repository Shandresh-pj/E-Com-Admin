import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { environment } from 'src/environment/environment';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { Subscription } from 'rxjs';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

@Component({
  selector: 'app-orders',
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
    MatTooltipModule,
    MatTable,
    AppTranslatePipe
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnInit {
  ordersList: any[] = [];
  products: any[] = [];
  companies: any[] = [];
  coupons: any[] = [];

  tableColumns: TableColumn[] = [
    { columnDef: 'invoice_no', header: 'Invoice' },
    { columnDef: 'company_name', header: 'Company' },
    { columnDef: 'total', header: 'Total', type: 'currency', format: 'INR' },
    { columnDef: 'payment_status', header: 'Pay Status', type: 'custom' },
    { columnDef: 'delivery_status', header: 'Delivery', type: 'custom' },
    { columnDef: 'created_at', header: 'Date', type: 'custom' }
  ];

  // Delivery status progression steps
  readonly DELIVERY_STEPS = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
  readonly DELIVERY_COLORS: Record<string, string> = {
    Pending:   '#f59e0b',
    Confirmed: '#6366f1',
    Shipped:   '#06b6d4',
    Delivered: '#22c55e',
    Cancelled: '#ef4444'
  };

  orderForm: FormGroup;
  showCreateForm = false;
  viewDetailsMode = false;
  selectedOrder: any = null;
  loading = false;
  apiUrl = environment.apiUrl;
  private socketSub = new Subscription();

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    private authService: AuthService,
    public perm: PermissionService,
    private cdr: ChangeDetectorRef,
    private socketService: SocketService
  ) {
    this.orderForm = this.fb.group({
      company_id: ['', Validators.required],
      coupon_code: [''],
      items: this.fb.array([], Validators.required),
      payment: this.fb.group({
        method: ['CASH', Validators.required],
        status: ['PENDING', Validators.required],
        transaction_id: [''],
        gateway: ['']
      })
    });
  }

  ngOnInit() {
    this.loadOrders();
    this.loadLookups();

    this.socketSub.add(this.socketService.on('order-created').subscribe(() => this.loadOrders()));
    this.socketSub.add(this.socketService.on('order-updated').subscribe(() => this.loadOrders()));
    this.socketSub.add(this.socketService.on('order-status-update').subscribe(() => this.loadOrders()));
  }

  ngOnDestroy() {
    this.socketSub.unsubscribe();
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  // ─── Data Loading ───────────────────────────────────────────────────────────

  loadOrders() {
    this.loading = true;
    this.commonService.getApi('orders').subscribe({
      next: (res: any) => {
        this.ordersList = res?.data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load orders list:', err);
        this.loading = false;
      }
    });
  }

  loadLookups() {
    this.commonService.getApi('companies').subscribe({
      next: (res: any) => { this.companies = res?.data || []; }
    });

    this.commonService.getApi('products').subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        this.products = list.filter((p: any) => p.approval_status === 'Published' || (!p.approval_status && p.status === 'active'));
      }
    });

    this.commonService.getApi('coupons').subscribe({
      next: (res: any) => { this.coupons = res?.data || []; },
      error: () => {}
    });
  }

  // ─── Order Form ─────────────────────────────────────────────────────────────

  createItemFormGroup(): FormGroup {
    return this.fb.group({
      product_id: ['', Validators.required],
      price: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0.01)]],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  addItem() {
    const itemGroup = this.createItemFormGroup();
    itemGroup.get('product_id')?.valueChanges.subscribe(prodId => {
      const prod = this.products.find(p => p.id === prodId);
      if (prod) {
        itemGroup.get('price')?.setValue(prod.price);
      }
    });
    this.items.push(itemGroup);
    this.cdr.detectChanges();
  }

  removeItem(index: number) {
    this.items.removeAt(index);
    this.cdr.detectChanges();
  }

  calculateSubtotal(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      return sum + (ctrl.get('price')?.value || 0) * (ctrl.get('quantity')?.value || 0);
    }, 0);
  }

  calculateDiscountValue(): number {
    const subtotal = this.calculateSubtotal();
    const code = this.orderForm.get('coupon_code')?.value;
    if (!code) return 0;
    const coupon = this.coupons.find(c => c.code?.toLowerCase() === code.trim().toLowerCase());
    if (!coupon) return 0;
    if (coupon.type === 'percent') return (subtotal * coupon.value) / 100;
    if (coupon.type === 'flat') return Math.min(coupon.value, subtotal);
    return 0;
  }

  calculateTotal(): number {
    const total = this.calculateSubtotal() - this.calculateDiscountValue();
    return total > 0 ? total : 0;
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    this.viewDetailsMode = false;
    if (!this.showCreateForm) {
      this.orderForm.reset();
      this.items.clear();
      this.orderForm.get('payment.method')?.setValue('CASH');
      this.orderForm.get('payment.status')?.setValue('PENDING');
    } else {
      this.addItem();
    }
  }

  submitOrder() {
    if (this.orderForm.invalid || this.items.length === 0) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.orderForm.getRawValue();
    const user = this.authService.getUser();
    const companyId = formValue.company_id || user?.company_id || user?.companyId || 1;
    const userId = user?.id || user?.userId;
    const branchId = user?.branch_id || user?.branchId;

    const payload = {
      user_id: userId,
      company_id: companyId,
      branch_id: branchId,
      coupon_code: formValue.coupon_code || undefined,
      payment: formValue.payment,
      items: formValue.items.map((item: any) => ({
        product_id: item.product_id,
        price: item.price,
        quantity: item.quantity
      }))
    };

    this.commonService.postApi('orders/create', payload).subscribe({
      next: () => {
        this.alert.success('Order placed successfully');
        this.toggleCreateForm();
        this.loadOrders();
      },
      error: (err) => {
        console.error('Order creation failed:', err);
        this.alert.error('Order creation failed: ' + (err.error?.message || 'Internal error'));
        this.loading = false;
      }
    });
  }

  // ─── Order Actions ──────────────────────────────────────────────────────────

  viewOrderDetails(row: any) {
    // Reload full order details for QR code and items
    this.commonService.getApi(`orders/${row.id}`).subscribe({
      next: (res: any) => {
        this.selectedOrder = res?.data || row;
        this.viewDetailsMode = true;
        this.showCreateForm = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback: use the row data from the table
        this.selectedOrder = row;
        this.viewDetailsMode = true;
        this.showCreateForm = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeDetails() {
    this.viewDetailsMode = false;
    this.selectedOrder = null;
  }

  downloadInvoice(row: any) {
    const id = row?.id || this.selectedOrder?.id;
    window.open(`${this.apiUrl}/orders/invoice/${id}`, '_blank');
  }

  /** Update delivery status — PATCH /orders/:id/delivery-status */
  updateDeliveryStatus(order: any, newStatus: string) {
    this.alert.confirm(`Mark order as "${newStatus}"?`).then(result => {
      if (!result.isConfirmed) return;
      this.commonService.patchApi(`orders/${order.id}/delivery-status`, { delivery_status: newStatus }).subscribe({
        next: () => {
          this.alert.success(`Order marked as ${newStatus}`);
          // Update in-place for instant UI feedback
          if (this.selectedOrder?.id === order.id) {
            this.selectedOrder = { ...this.selectedOrder, delivery_status: newStatus };
          }
          this.loadOrders();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Failed to update delivery status');
        }
      });
    });
  }

  /** Cancel an order — PATCH /orders/:id/cancel */
  cancelOrder(order: any) {
    this.alert.confirm('Are you sure you want to cancel this order? This action cannot be undone.').then(result => {
      if (!result.isConfirmed) return;
      this.commonService.patchApi(`orders/${order.id}/cancel`, { status: 'Cancelled' }).subscribe({
        next: () => {
          this.alert.success('Order cancelled successfully');
          if (this.selectedOrder?.id === order.id) {
            this.selectedOrder = { ...this.selectedOrder, delivery_status: 'Cancelled', status: 'Cancelled' };
          }
          this.loadOrders();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Failed to cancel order');
        }
      });
    });
  }

  /** Mark as Delivered shortcut */
  markAsDelivered(order: any) {
    this.updateDeliveryStatus(order, 'Delivered');
  }

  /** Update payment status */
  updatePaymentStatus(order: any, newStatus: string) {
    this.commonService.patchApi(`orders/${order.id}/payment-status`, { payment_status: newStatus }).subscribe({
      next: () => {
        this.alert.success(`Payment status updated to ${newStatus}`);
        if (this.selectedOrder?.id === order.id) {
          this.selectedOrder = { ...this.selectedOrder, payment_status: newStatus };
        }
        this.loadOrders();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to update payment status');
      }
    });
  }

  deleteOrder(row: any) {
    this.alert.confirm('Are you sure you want to delete this order?').then(result => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.deleteApi(`orders/${row.id}`).subscribe({
          next: () => {
            this.alert.success('Order deleted successfully');
            this.loadOrders();
            if (this.viewDetailsMode) this.closeDetails();
          },
          error: (err) => {
            console.error('Failed to delete order:', err);
            this.alert.error('Delete failed: ' + (err.error?.message || 'Internal error'));
            this.loading = false;
          }
        });
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getProductName(productId: number): string {
    const prod = this.products.find(p => p.id === productId);
    return prod ? prod.name : `#${productId}`;
  }

  getDeliveryStatusColor(status: string): string {
    return this.DELIVERY_COLORS[status] || '#94a3b8';
  }

  getDeliveryStepIndex(status: string): number {
    return this.DELIVERY_STEPS.indexOf(status);
  }

  /** Returns the next available delivery status after the current one */
  getNextDeliveryStatus(current: string): string | null {
    const idx = this.DELIVERY_STEPS.indexOf(current);
    if (idx < 0 || idx >= this.DELIVERY_STEPS.length - 1) return null;
    return this.DELIVERY_STEPS[idx + 1];
  }

  isOrderCancellable(order: any): boolean {
    return !['Delivered', 'Cancelled'].includes(order?.delivery_status);
  }

  isOrderDelivered(order: any): boolean {
    return order?.delivery_status === 'Delivered';
  }
}
