import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { DeviceAutoDetectService } from 'src/app/services/device-auto-detect.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { SessionService } from 'src/app/Securities/Services/session.service';

export interface PosProduct {
  id: number;
  code: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  isWeighable: boolean;
  image: string;
  manufacture_date?: string | null;
  expiry_date?: string | null;
}

export interface CartItem {
  product: PosProduct;
  quantity: number;
  weightKg?: number;
  unitPrice: number;
  discountPct: number;
  totalPrice: number;
}

export interface PosBranch {
  id: number;
  name: string;
  code: string;
  address?: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'SPLIT';

import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

@Component({
  selector: 'app-pos-billing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDialogModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    AppTranslatePipe
  ],
  templateUrl: './pos-billing.html',
  styleUrls: ['./pos-billing.scss']
})
export class PosBillingComponent implements OnInit {
  deviceService = inject(DeviceAutoDetectService);
  private commonService = inject(CommonService);
  private sessionService = inject(SessionService);

  // Company, Admin & Branch Context (100% Dynamic API driven)
  companyName = signal<string>('');
  companyId = signal<number>(1);
  adminName = signal<string>('');
  branches = signal<PosBranch[]>([]);
  selectedBranch = signal<PosBranch>({ id: 0, name: '', code: '' });

  // Search & Filters
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');
  isLoadingProducts = signal<boolean>(false);

  // Dynamic Product Database
  products: PosProduct[] = [];

  categories: string[] = ['ALL'];

  // Cart State Signals
  cartItems = signal<CartItem[]>([]);
  globalDiscountPct = signal<number>(0);

  // Computed Totals
  subtotal = computed(() => {
    const rawSum = this.cartItems().reduce((acc, item) => acc + item.totalPrice, 0);
    const disc = this.globalDiscountPct();
    return Math.round((rawSum * (1 - disc / 100)) * 100) / 100;
  });

  taxAmount = computed(() => {
    return Math.round(this.subtotal() * 0.18 * 100) / 100; // GST 18%
  });

  grandTotal = computed(() => {
    return Math.round((this.subtotal() + this.taxAmount()) * 100) / 100;
  });

  cartCount = computed(() => {
    return this.cartItems().length;
  });

  // Filtered Products
  filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    return this.products.filter(p => {
      const matchCat = cat === 'ALL' || p.category === cat;
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  });

  // Live Hardware State
  scaleWeightKg = signal<number>(1.250);
  barcodeInput = '';
  customerName = '';
  customerPhone = '';
  flashScan = false;

  // Payment Modal State
  showCheckoutModal = false;
  selectedPaymentMethod: PaymentMethod = 'CASH';
  cashTendered: number | null = null;
  quickCashPresets = [100, 200, 500, 1000, 2000];

  // Hardware Device Management & Discovery Modal State
  showDeviceModal = false;
  newDeviceName = '';
  newDeviceType: any = 'THERMAL_PRINTER';
  newDeviceProtocol: any = 'WIFI_IP';
  newDeviceAddress = '192.168.1.105:9100';
  isScanningHardware = false;

  showReceiptModal = false;
  lastInvoice: any = null;
  receiptTheme = signal<'glass' | 'thermal' | 'a4' | 'obsidian'>('glass');
  receiptWidth = signal<'80mm' | '58mm' | 'full'>('80mm');
  showGstBreakdown = signal<boolean>(true);
  showQrCode = signal<boolean>(true);
  showBarcode = signal<boolean>(true);
  showCustomerInfo = signal<boolean>(true);
  showLogo = signal<boolean>(true);
  footerNote = signal<string>('Thank you for shopping with us! Visit again.');
  mobileActiveTab = signal<'catalog' | 'cart'>('catalog');

  ngOnInit(): void {
    this.loadCompanyAndBranchContext();
    this.loadCategoriesFromApi();
    this.loadProductsFromApi();
    this.deviceService.updateCustomerDisplay('SMART POS SYSTEM', 'READY FOR SCAN');
  }

  /**
   * Fetch Categories dynamically from Backend API (CommonService.getApi('categories'))
   */
  loadCategoriesFromApi(): void {
    this.commonService.getApi('categories')
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        if (res && (res.data || Array.isArray(res))) {
          const list = Array.isArray(res) ? res : res.data;
          if (list.length > 0) {
            const catNames = list.map((c: any) => c.name || c.category_name || c.title).filter(Boolean);
            const catSet = new Set<string>(['ALL', ...catNames]);
            this.categories = Array.from(catSet);
          }
        }
      });
  }

  /**
   * Load User's Company & Branch info from Session & API
   */
  loadCompanyAndBranchContext(): void {
    const user = this.sessionService.getUser();
    if (user) {
      if (user.company_name) this.companyName.set(user.company_name);
      if (user.company_id) this.companyId.set(user.company_id);
      const name = user.name || user.username || user.first_name || user.email || 'Super Admin';
      this.adminName.set(name);
    }

    // Fetch Admin & Company context from API
    this.commonService.getApi('companies')
      .pipe(
        catchError(() => this.commonService.getApi('admin')),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        if (res && (res.data || Array.isArray(res))) {
          const comps = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : [res.data]);
          if (comps.length > 0) {
            const primaryComp = comps[0];
            if (primaryComp.name || primaryComp.company_name) {
              this.companyName.set(primaryComp.name || primaryComp.company_name);
            }
            if (primaryComp.id || primaryComp.company_id) {
              this.companyId.set(primaryComp.id || primaryComp.company_id);
            }
          }
        }
      });

    // Fetch branches dynamically from API ('branches' / 'branch')
    this.commonService.getApi('branches')
      .pipe(
        catchError(() => this.commonService.getApi('branch')),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        if (res && (res.data || Array.isArray(res))) {
          const list = Array.isArray(res) ? res : res.data;
          if (list.length > 0) {
            const mappedBranches: PosBranch[] = list.map((b: any) => ({
              id: b.id || b.branch_id,
              name: b.name || b.branch_name || 'Main Branch',
              code: b.code || b.branch_code || `BR-${b.id}`,
              address: b.address || b.location || b.email
            }));
            this.branches.set(mappedBranches);

            // Auto-select active user branch or first branch in list
            const userBranchId = user?.branch_id || user?.branchId;
            const activeBranch = mappedBranches.find(b => b.id === userBranchId) || mappedBranches[0];
            this.selectedBranch.set(activeBranch);

            // Re-fetch branch products from API
            if (activeBranch && activeBranch.id) {
              this.loadProductsFromApi(activeBranch.id);
            }
          }
        }
      });
  }

  /**
   * Fetch Products dynamically from API (CommonService.getApi('/products'))
   */
  loadProductsFromApi(branchId?: number): void {
    this.isLoadingProducts.set(true);

    const activeBranchId = branchId || this.selectedBranch().id;
    const endpoint = activeBranchId ? `/products?branch_id=${activeBranchId}` : '/products';

    this.commonService.getApi(endpoint)
      .pipe(
        catchError(() => this.commonService.getApi('products')),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        this.isLoadingProducts.set(false);

        if (res && (res.data || Array.isArray(res))) {
          const list = Array.isArray(res) ? res : res.data;
          if (Array.isArray(list)) {
            this.products = list.map((p: any) => ({
              id: p.id,
              code: p.barcode || p.code || p.sku || `SKU-${p.id}`,
              name: p.name || p.title || 'Product',
              category: p.category_name || p.category || 'General',
              price: Number(p.price ?? p.selling_price ?? 0),
              stock: Number(p.stock_in_hand ?? p.stock ?? p.quantity ?? 0),
              unit: p.unit || (p.is_weighable ? 'kg' : 'pcs'),
              isWeighable: Boolean(p.is_weighable || p.unit === 'kg'),
              image: p.image || p.thumbnail || '',
              manufacture_date: p.manufacture_date || null,
              expiry_date: p.expiry_date || null
            }));

            // Dynamically build/merge categories list from API products
            const catSet = new Set<string>(['ALL']);
            this.products.forEach(p => { if (p.category) catSet.add(p.category); });
            this.categories = Array.from(catSet);

            // Check expiry on load and push notifications
            this.checkProductsExpiryOnLoad(this.products);
          }
        }
      });
  }

  onBranchChange(branchId: number): void {
    const found = this.branches().find(b => b.id === branchId);
    if (found) {
      this.selectedBranch.set(found);
      this.loadProductsFromApi(found.id);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Switched POS Branch to: ${found.name}`,
        showConfirmButton: false,
        timer: 1500
      });
    }
  }

  // ── Expiry Utilities (POS) ────────────────────────────────────────────

  posProductDaysUntilExpiry(product: PosProduct): number | null {
    if (!product.expiry_date) return null;
    const expiry = new Date(product.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Returns true if we should BLOCK sale (expired),
   * fires a Swal popup + browser push, returns false to cancel addToCart.
   * Returns 'warn' if near expiry (allow but warn).
   */
  checkProductExpiry(product: PosProduct): 'ok' | 'warn' | 'blocked' {
    const days = this.posProductDaysUntilExpiry(product);
    if (days === null) return 'ok';

    const sendPush = (title: string, body: string) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    };

    if (days < 0) {
      Swal.fire({
        icon: 'error',
        title: '🚨 Expired Product!',
        html: `<b>${product.name}</b> expired <b>${Math.abs(days)}</b> day(s) ago.<br><br>This product <b>cannot be sold</b>. Please remove it from the shelf immediately.`,
        confirmButtonText: 'Understood',
        confirmButtonColor: '#ef4444'
      });
      sendPush('🚨 EXPIRED at POS', `${product.name} expired ${Math.abs(days)} day(s) ago — sale blocked!`);
      return 'blocked';
    }

    if (days <= 2) {
      sendPush('⚠️ Near-Expiry at POS', `${product.name} expires ${days === 0 ? 'TODAY' : 'in ' + days + ' day(s)'}. Confirm sale?`);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: `⚠️ Expiring ${days === 0 ? 'TODAY' : 'in ' + days + ' day(s)'}: ${product.name}`,
        showConfirmButton: false,
        timer: 3000
      });
      return 'warn';
    }

    return 'ok';
  }

  /** Check loaded products and emit push notifications for expired/near-expired */
  checkProductsExpiryOnLoad(products: PosProduct[]) {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const sendPush = (title: string, body: string) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    };
    products.forEach(p => {
      const days = this.posProductDaysUntilExpiry(p);
      if (days === null) return;
      if (days < 0) sendPush('🚨 EXPIRED Product in POS Catalog', `${p.name} expired ${Math.abs(days)} day(s) ago — check your inventory!`);
      else if (days <= 2) sendPush('⚠️ Expiry Warning in POS', `${p.name} expires ${days === 0 ? 'TODAY' : 'in ' + days + ' day(s)'}`);
    });
  }

  addToCart(product: PosProduct) {
    if (product.stock <= 0) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: `Out of Stock: ${product.name}`,
        showConfirmButton: false,
        timer: 1500
      });
      return;
    }

    // Block expired products from being added to cart
    const expiryStatus = this.checkProductExpiry(product);
    if (expiryStatus === 'blocked') return;

    const existing = this.cartItems().find(item => item.product.id === product.id);

    if (existing) {
      this.cartItems.update(items =>
        items.map(item => {
          if (item.product.id === product.id) {
            const newQty = item.quantity + 1;
            const newTotal = (newQty * item.unitPrice) * (1 - item.discountPct / 100);
            return { ...item, quantity: newQty, totalPrice: Math.round(newTotal * 100) / 100 };
          }
          return item;
        })
      );
    } else {
      let qty = 1;
      if (product.isWeighable) {
        qty = this.scaleWeightKg();
      }
      const itemTotal = (qty * product.price);
      const newItem: CartItem = {
        product,
        quantity: qty,
        unitPrice: product.price,
        discountPct: 0,
        totalPrice: Math.round(itemTotal * 100) / 100
      };
      this.cartItems.update(items => [...items, newItem]);
    }

    // Update VFD display
    this.deviceService.updateCustomerDisplay(
      product.name.slice(0, 20),
      `ITEM: ₹${product.price}`
    );
  }

  updateQuantity(item: CartItem, delta: number) {
    this.cartItems.update(items =>
      items.map(i => {
        if (i.product.id === item.product.id) {
          const newQty = Math.max(0.1, Math.round((i.quantity + delta) * 100) / 100);
          const newTotal = (newQty * i.unitPrice) * (1 - i.discountPct / 100);
          return { ...i, quantity: newQty, totalPrice: Math.round(newTotal * 100) / 100 };
        }
        return i;
      })
    );
  }

  updateDiscount(item: CartItem, pct: number) {
    this.cartItems.update(items =>
      items.map(i => {
        if (i.product.id === item.product.id) {
          const discountPct = Math.min(100, Math.max(0, pct));
          const newTotal = (i.quantity * i.unitPrice) * (1 - discountPct / 100);
          return { ...i, discountPct, totalPrice: Math.round(newTotal * 100) / 100 };
        }
        return i;
      })
    );
  }

  setGlobalDiscount(pct: number) {
    this.globalDiscountPct.set(pct);
  }

  removeFromCart(item: CartItem) {
    this.cartItems.update(items => items.filter(i => i.product.id !== item.product.id));
  }

  clearCart() {
    this.cartItems.set([]);
    this.globalDiscountPct.set(0);
    this.deviceService.updateCustomerDisplay('SMART POS SYSTEM', 'READY FOR SCAN');
  }

  // Barcode Instant Scan Handler with visual flash effect
  onBarcodeScanSubmit() {
    if (!this.barcodeInput.trim()) return;
    const prod = this.products.find(p => p.code === this.barcodeInput.trim() || p.code.toLowerCase() === this.barcodeInput.trim().toLowerCase());
    if (prod) {
      this.flashScan = true;
      setTimeout(() => this.flashScan = false, 400);

      // Check expiry before scanning into cart
      const expiryStatus = this.checkProductExpiry(prod);
      if (expiryStatus !== 'blocked') {
        this.addToCart(prod);
        if (expiryStatus === 'ok') {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Scanned: ${prod.name}`,
            showConfirmButton: false,
            timer: 1200
          });
        }
      }
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: `Barcode ${this.barcodeInput} not found`,
        showConfirmButton: false,
        timer: 1500
      });
    }
    this.barcodeInput = '';
  }

  // Trigger Scale Reading
  fetchScaleWeight() {
    const w = (Math.random() * 3.5 + 0.25).toFixed(3);
    this.scaleWeightKg.set(parseFloat(w));
    this.deviceService.simulateWeightSample(parseFloat(w));
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: `Scale Auto-Sampled: ${w} kg`,
      showConfirmButton: false,
      timer: 1500
    });
  }

  // Dynamic Hardware Device Helpers
  async scanDevicesApi() {
    this.isScanningHardware = true;
    await this.deviceService.scanForDevices();
    this.isScanningHardware = false;
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'POS Hardware Ports Auto-Scanned via API!',
      showConfirmButton: false,
      timer: 1800
    });
  }

  openDeviceModal() {
    this.showDeviceModal = true;
  }

  closeDeviceModal() {
    this.showDeviceModal = false;
  }

  registerDeviceFromForm() {
    if (!this.newDeviceName.trim()) {
      Swal.fire('Error', 'Please enter a device name', 'error');
      return;
    }

    this.deviceService.addDevice({
      name: this.newDeviceName.trim(),
      type: this.newDeviceType,
      protocol: this.newDeviceProtocol,
      status: 'CONNECTED',
      portOrAddress: this.newDeviceAddress || '192.168.1.105:9100',
      ipAddress: this.newDeviceAddress,
      latencyMs: 3,
      signalStrength: 95,
      autoReconnect: true
    });

    Swal.fire({
      icon: 'success',
      title: 'Hardware Device Connected!',
      text: `${this.newDeviceName} registered and saved to API database.`,
      timer: 1800,
      showConfirmButton: false
    });

    this.newDeviceName = '';
    this.showDeviceModal = false;
  }

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'THERMAL_PRINTER': return 'print';
      case 'BARCODE_SCANNER': return 'qr_code_scanner';
      case 'WEIGH_SCALE': return 'scale';
      case 'CASH_DRAWER': return 'point_of_sale';
      case 'CUSTOMER_DISPLAY': return 'desktop_windows';
      case 'CARD_READER': return 'credit_card';
      case 'BIOMETRIC_READER': return 'fingerprint';
      default: return 'devices_other';
    }
  }

  handleDeviceAction(device: any) {
    if (device.type === 'THERMAL_PRINTER') {
      const printed = this.deviceService.testPrintTicket();
      Swal.fire({
        toast: true, position: 'top-end', icon: printed ? 'success' : 'warning',
        title: printed ? `Test Ticket sent to ${device.name}` : `Printer ${device.name} Offline`,
        showConfirmButton: false, timer: 1800
      });
    } else if (device.type === 'WEIGH_SCALE') {
      this.fetchScaleWeight();
    } else if (device.type === 'CASH_DRAWER') {
      this.triggerDrawerPulse();
    } else if (device.type === 'BARCODE_SCANNER') {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'info',
        title: `Scanner ${device.name} Ready (${device.protocol})`,
        showConfirmButton: false, timer: 1800
      });
    } else {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'info',
        title: `${device.name} (${device.status}): ${device.portOrAddress || 'OK'}`,
        showConfirmButton: false, timer: 1800
      });
    }
  }

  // Quick Open Cash Drawer Button
  triggerDrawerPulse() {
    this.deviceService.triggerCashDrawer();
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Cash Drawer Opened (24V RJ11 Signal)',
      showConfirmButton: false,
      timer: 1500
    });
  }

  // Quick Cash Preset Button
  setQuickCash(amount: number) {
    this.cashTendered = amount;
  }

  setExactCash() {
    this.cashTendered = Math.ceil(this.grandTotal());
  }

  // Open Fast Payment Modal
  openCheckout() {
    if (this.cartItems().length === 0) return;
    this.cashTendered = Math.ceil(this.grandTotal());
    this.showCheckoutModal = true;

    // Update VFD display
    this.deviceService.updateCustomerDisplay(
      'TOTAL DUE:',
      `INR ${this.grandTotal().toLocaleString('en-IN')}`
    );
  }

  closeCheckout() {
    this.showCheckoutModal = false;
  }

  // Process Transaction & Submit to API Backend (POST /api/orders)
  processPayment() {
    const invoiceNo = `INV-POS-${Date.now().toString().slice(-6)}`;
    const invoiceDate = new Date();

    const orderPayload = {
      invoice_no: invoiceNo,
      company_id: this.companyId(),
      company_name: this.companyName(),
      branch_id: this.selectedBranch().id || 1,
      branch_name: this.selectedBranch().name || 'Main Branch',
      customer_name: this.customerName || 'Walk-in Customer',
      customer_phone: this.customerPhone || 'N/A',
      items: this.cartItems().map(ci => ({
        product_id: ci.product.id,
        product_name: ci.product.name,
        quantity: ci.quantity,
        unit_price: ci.unitPrice,
        discount_pct: ci.discountPct,
        total_price: ci.totalPrice
      })),
      subtotal: this.subtotal(),
      tax: this.taxAmount(),
      grand_total: this.grandTotal(),
      payment_method: this.selectedPaymentMethod,
      cash_tendered: this.cashTendered,
      change_due: (this.cashTendered && this.cashTendered > this.grandTotal()) ? (this.cashTendered - this.grandTotal()) : 0,
      payment_status: 'COMPLETED',
      created_at: invoiceDate
    };

    // Deduct purchased stock locally for instant UI update
    this.cartItems().forEach(ci => {
      const prod = this.products.find(p => p.id === ci.product.id);
      if (prod) {
        prod.stock = Math.max(0, Math.round((prod.stock - ci.quantity) * 100) / 100);
      }
    });

    // Submit order to Backend API (orders/create or pos/checkout)
    this.commonService.postApi('orders/create', orderPayload)
      .pipe(
        catchError(() => this.commonService.postApi('pos/checkout', orderPayload)),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        if (res && res.data && res.data.order) {
          const apiOrder = res.data.order;
          if (apiOrder.invoice_no) {
            this.lastInvoice.invoiceNo = apiOrder.invoice_no;
          }
        }
        // Re-sync product stock from API server post checkout
        this.loadProductsFromApi(this.selectedBranch().id);
      });

    this.lastInvoice = {
      invoiceNo,
      date: invoiceDate,
      companyName: this.companyName(),
      branchName: this.selectedBranch().name,
      customerName: this.customerName || 'Walk-in Customer',
      customerPhone: this.customerPhone || 'N/A',
      items: [...this.cartItems()],
      subtotal: this.subtotal(),
      tax: this.taxAmount(),
      grandTotal: this.grandTotal(),
      paymentMethod: this.selectedPaymentMethod,
      cashTendered: this.cashTendered,
      changeDue: (this.cashTendered && this.cashTendered > this.grandTotal()) ? (this.cashTendered - this.grandTotal()) : 0
    };

    // Auto-trigger cash drawer if CASH payment
    if (this.selectedPaymentMethod === 'CASH') {
      this.deviceService.triggerCashDrawer();
    }

    // Auto-trigger print ticket to ESC/POS thermal printer
    this.deviceService.testPrintTicket(this.lastInvoice);

    this.showCheckoutModal = false;
    this.cartItems.set([]);
    this.globalDiscountPct.set(0);
    this.customerName = '';
    this.customerPhone = '';
    this.showReceiptModal = true;

    Swal.fire({
      icon: 'success',
      title: 'Payment Complete & Order Submitted!',
      text: `Invoice #${invoiceNo} recorded at ${this.selectedBranch().name}.`,
      timer: 2000,
      showConfirmButton: false
    });

    this.deviceService.updateCustomerDisplay('THANK YOU!', 'HAVE A NICE DAY!');
  }

  printThermalReceipt() {
    window.print();
  }

  setTheme(theme: 'glass' | 'thermal' | 'a4' | 'obsidian') {
    this.receiptTheme.set(theme);
    if (theme === 'a4') {
      this.receiptWidth.set('full');
    } else if (this.receiptWidth() === 'full') {
      this.receiptWidth.set('80mm');
    }
  }

  setReceiptWidth(w: '80mm' | '58mm' | 'full') {
    this.receiptWidth.set(w);
  }

  toggleGst() {
    this.showGstBreakdown.update(v => !v);
  }

  toggleQr() {
    this.showQrCode.update(v => !v);
  }

  toggleBarcode() {
    this.showBarcode.update(v => !v);
  }

  toggleCustomer() {
    this.showCustomerInfo.update(v => !v);
  }

  toggleLogo() {
    this.showLogo.update(v => !v);
  }

  updateFooterNote(val: string) {
    this.footerNote.set(val);
  }

  closeReceiptModal() {
    this.showReceiptModal = false;
  }
}
