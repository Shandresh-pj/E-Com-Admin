import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { environment } from 'src/environment/environment';
import { MatTable, TableColumn } from 'src/utils/mat-table/mat-table';
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
    { columnDef: 'total', header: 'Total', type: 'currency', format: 'USD' },
    { columnDef: 'payment_status', header: 'Pay Status', type: 'badge' },
    { columnDef: 'delivery_status', header: 'Delivery', type: 'badge' },
    { columnDef: 'created_at', header: 'Date', type: 'custom' }
  ];

  orderForm: FormGroup;
  showCreateForm = false;
  viewDetailsMode = false;
  selectedOrder: any = null;
  loading = false;
  apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private cdr: ChangeDetectorRef
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
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

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
      error: () => {} // Ignore if coupon router isn't fully ready yet
    });
  }

  createItemFormGroup(): FormGroup {
    return this.fb.group({
      product_id: ['', Validators.required],
      price: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0.01)]],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  addItem() {
    const itemGroup = this.createItemFormGroup();
    // Watch for product changes to automatically pre-populate price
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
    let subtotal = 0;
    this.items.controls.forEach(control => {
      const price = control.get('price')?.value || 0;
      const qty = control.get('quantity')?.value || 0;
      subtotal += price * qty;
    });
    return subtotal;
  }

  calculateDiscountValue(): number {
    const subtotal = this.calculateSubtotal();
    const code = this.orderForm.get('coupon_code')?.value;
    if (!code) return 0;
    
    const coupon = this.coupons.find(c => c.code.toLowerCase() === code.trim().toLowerCase());
    if (!coupon) return 0;

    if (coupon.type === 'percent') {
      return (subtotal * coupon.value) / 100;
    } else if (coupon.type === 'flat') {
      return Math.min(coupon.value, subtotal);
    }
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
      this.addItem(); // Start with one item
    }
  }

  submitOrder() {
    if (this.orderForm.invalid || this.items.length === 0) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.orderForm.getRawValue();
    
    // Clean and validate items payload
    const payload = {
      company_id: formValue.company_id,
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
        this.alert.success("Order created successfully");
        this.toggleCreateForm();
        this.loadOrders();
      },
      error: (err) => {
        console.error('Order creation failed:', err);
        this.alert.error("Order creation failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  viewOrderDetails(row: any) {
    this.selectedOrder = row;
    this.viewDetailsMode = true;
    this.showCreateForm = false;
  }

  closeDetails() {
    this.viewDetailsMode = false;
    this.selectedOrder = null;
  }

  downloadInvoice(row: any) {
    const id = row.id || this.selectedOrder.id;
    window.open(`${this.apiUrl}/orders/invoice/${id}`, '_blank');
  }

  deleteOrder(row: any) {
    this.alert.confirm("Are you sure you want to delete this order?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.deleteApi(`orders/${row.id}`).subscribe({
          next: () => {
            this.alert.success("Order deleted successfully");
            this.loadOrders();
            if (this.viewDetailsMode) {
              this.closeDetails();
            }
          },
          error: (err) => {
            console.error('Failed to delete order:', err);
            this.alert.error("Delete failed: " + (err.error?.message || "Internal error"));
            this.loading = false;
          }
        });
      }
    });
  }

  getProductName(productId: number): string {
    const prod = this.products.find(p => p.id === productId);
    return prod ? prod.name : `Product ID: ${productId}`;
  }
}
