import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

@Component({
  selector: 'app-menu-bar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    MatTable
  ],
  templateUrl: './menu-bar.html',
  styleUrl: './menu-bar.scss',
})
export class MenuBar implements OnInit {
  tableColumns = [
    {
      columnDef: 'id',
      header: 'No'
    },
    {
      columnDef: 'name',
      header: 'Menu Name'
    },
    {
      columnDef: 'path',
      header: 'Path'
    },
    {
      columnDef: 'webIcon',
      header: 'Web Icon'
    },
    {
      columnDef: 'appIcon',
      header: 'App Icon'
    },
    {
      columnDef: 'status',
      header: 'Status'
    }
  ];

  searchQuery: string = '';
  MenuForm: FormGroup;
  Menu_Forms: boolean = false;
  View_Mode: boolean = false;
  Update_button: boolean = false;
  menus: any[] = [];
  SelectedMenuId: any = null;
  SelectedMenu: any = null;

  get activeMenusCount(): number { return (this.menus || []).filter(m => m.isActive || m.status === 'Active' || m.statusText === 'Active').length; }
  get systemRoutesCount(): number { return this.defaultRoutes.length; }

  defaultRoutes = [
    { name: 'Admin', path: '/admin', icon: 'bi-shield-lock-fill', webIcon: 'bi-shield-lock-fill', appIcon: 'admin_panel_settings', isActive: true },
    { name: 'Branches', path: '/branch', icon: 'bi-building-fill', webIcon: 'bi-building-fill', appIcon: 'account_tree', isActive: true },
    { name: 'Employees', path: '/employees', icon: 'bi-people-fill', webIcon: 'bi-people-fill', appIcon: 'badge', isActive: true },
    { name: 'Roles', path: '/roles', icon: 'bi-key-fill', webIcon: 'bi-key-fill', appIcon: 'security', isActive: true },
    { name: 'Role Access', path: '/role-access', icon: 'bi-shield-check', webIcon: 'bi-shield-check', appIcon: 'lock_person', isActive: true },
    { name: 'Profile', path: '/profile', icon: 'bi-person-badge-fill', webIcon: 'bi-person-badge-fill', appIcon: 'person', isActive: true },
    { name: 'Menu Management', path: '/menubar', icon: 'bi-list-stars', webIcon: 'bi-list-stars', appIcon: 'menu', isActive: true },
    { name: 'Statuses', path: '/status', icon: 'bi-check2-square', webIcon: 'bi-check2-square', appIcon: 'toggle_on', isActive: true },
    { name: 'Attributes', path: '/product-attribute', icon: 'bi-sliders', webIcon: 'bi-sliders', appIcon: 'sell', isActive: true },
    { name: 'Categories', path: '/category', icon: 'bi-folder-fill', webIcon: 'bi-folder-fill', appIcon: 'category', isActive: true },
    { name: 'Products', path: '/product', icon: 'bi-box-seam-fill', webIcon: 'bi-box-seam-fill', appIcon: 'inventory_2', isActive: true },
    { name: 'Units Master', path: '/units', icon: 'bi-rulers', webIcon: 'bi-rulers', appIcon: 'square_foot', isActive: true },
    { name: 'Orders', path: '/orders', icon: 'bi-bag-check-fill', webIcon: 'bi-bag-check-fill', appIcon: 'shopping_cart', isActive: true },
    { name: 'Coupons', path: '/coupons', icon: 'bi-ticket-perforated-fill', webIcon: 'bi-ticket-perforated-fill', appIcon: 'confirmation_number', isActive: true },
    { name: 'Change Password', path: '/change-password', icon: 'bi-lock-fill', webIcon: 'bi-lock-fill', appIcon: 'key', isActive: true },
    { name: 'Audit Logs', path: '/audit-logs', icon: 'bi-clock-history', webIcon: 'bi-clock-history', appIcon: 'receipt_long', isActive: true },
    { name: 'Alerts', path: '/alerts', icon: 'bi-exclamation-triangle-fill', webIcon: 'bi-exclamation-triangle-fill', appIcon: 'notifications_active', isActive: true },
    { name: 'Attendance', path: '/attendance', icon: 'bi-calendar-check-fill', webIcon: 'bi-calendar-check-fill', appIcon: 'history', isActive: true },
    { name: 'Branch Inventory', path: '/branch-stocks', icon: 'bi-houses-fill', webIcon: 'bi-houses-fill', appIcon: 'store', isActive: true },
    { name: 'Stock Control', path: '/stocks', icon: 'bi-boxes', webIcon: 'bi-boxes', appIcon: 'warehouse', isActive: true },
    { name: 'Payroll', path: '/payroll', icon: 'bi-cash-coin', webIcon: 'bi-cash-coin', appIcon: 'payments', isActive: true },
    { name: 'Leave Management', path: '/leave', icon: 'bi-airplane-fill', webIcon: 'bi-airplane-fill', appIcon: 'event_busy', isActive: true },
    { name: 'Deliveries', path: '/delivery-tracking', icon: 'bi-truck', webIcon: 'bi-truck', appIcon: 'local_shipping', isActive: true },
    { name: 'Payments', path: '/payments', icon: 'bi-credit-card-2-front-fill', webIcon: 'bi-credit-card-2-front-fill', appIcon: 'account_balance_wallet', isActive: true },
    { name: 'Notifications', path: '/notifications', icon: 'bi-bell-fill', webIcon: 'bi-bell-fill', appIcon: 'notifications', isActive: true },
    { name: 'Workforce', path: '/workforce', icon: 'bi-gear-wide-connected', webIcon: 'bi-gear-wide-connected', appIcon: 'tune', isActive: true },
    { name: 'Invoices', path: '/invoices', icon: 'bi-file-earmark-text-fill', webIcon: 'bi-file-earmark-text-fill', appIcon: 'description', isActive: true },
    { name: 'Approvals', path: '/approvals', icon: 'bi-patch-check-fill', webIcon: 'bi-patch-check-fill', appIcon: 'approval', isActive: true },
    { name: 'Workforce Requests', path: '/workforce-requests', icon: 'bi-briefcase-fill', webIcon: 'bi-briefcase-fill', appIcon: 'assignment', isActive: true },
    { name: 'CRM Contacts', path: '/crm-contacts', icon: 'bi-person-rolodex', webIcon: 'bi-person-rolodex', appIcon: 'contacts', isActive: true },
    { name: 'Profit & Loss', path: '/profit-loss', icon: 'bi-pie-chart-fill', webIcon: 'bi-pie-chart-fill', appIcon: 'monetization_on', isActive: true },
    { name: 'Plan Admin', path: '/manage-subscription-plans', icon: 'bi-gem', webIcon: 'bi-gem', appIcon: 'diamond', isActive: true },
    { name: 'Subscription', path: '/subscription-plans', icon: 'bi-star-fill', webIcon: 'bi-star-fill', appIcon: 'star', isActive: true },
    { name: 'Billing', path: '/billing-history', icon: 'bi-receipt', webIcon: 'bi-receipt', appIcon: 'receipt', isActive: true },
    { name: 'Plan Coupons', path: '/subscription-coupons', icon: 'bi-ticket-detailed-fill', webIcon: 'bi-ticket-detailed-fill', appIcon: 'card_giftcard', isActive: true },
    { name: 'Checkout', path: '/checkout', icon: 'bi-credit-card-fill', webIcon: 'bi-credit-card-fill', appIcon: 'payment', isActive: true },
    { name: 'Calendar', path: '/calendar', icon: 'bi-calendar-event-fill', webIcon: 'bi-calendar-event-fill', appIcon: 'calendar_month', isActive: true },
    { name: 'Documents', path: '/employee-documents', icon: 'bi-file-earmark-check-fill', webIcon: 'bi-file-earmark-check-fill', appIcon: 'folder_shared', isActive: true },
    { name: 'Translations', path: '/translations', icon: 'bi-translate', webIcon: 'bi-translate', appIcon: 'translate', isActive: true },
    { name: 'POS Terminal', path: '/pos-billing', icon: 'bi-calculator-fill', webIcon: 'bi-calculator-fill', appIcon: 'point_of_sale', isActive: true },
    { name: 'Devices', path: '/devices', icon: 'bi-cpu-fill', webIcon: 'bi-cpu-fill', appIcon: 'devices', isActive: true },
    { name: 'Chat', path: '/communication', icon: 'bi-chat-dots-fill', webIcon: 'bi-chat-dots-fill', appIcon: 'forum', isActive: true },
    { name: 'Meetings', path: '/communication/meetings', icon: 'bi-camera-video-fill', webIcon: 'bi-camera-video-fill', appIcon: 'videocam', isActive: true },
    { name: 'Mobility Hub', path: '/mobility-dashboard', icon: 'bi-car-front-fill', webIcon: 'bi-car-front-fill', appIcon: 'directions_car', isActive: true },
    { name: 'Rides', path: '/ride-booking', icon: 'bi-steering-wheel', webIcon: 'bi-steering-wheel', appIcon: 'local_taxi', isActive: true },
    { name: 'Car Rentals', path: '/car-rental', icon: 'bi-key-fill', webIcon: 'bi-key-fill', appIcon: 'car_rental', isActive: true },
    { name: 'Logistics', path: '/parcel-logistics', icon: 'bi-truck-front-fill', webIcon: 'bi-truck-front-fill', appIcon: 'local_shipping', isActive: true },
    { name: 'Fleet', path: '/fleet-management', icon: 'bi-radar', webIcon: 'bi-radar', appIcon: 'radar', isActive: true },
    { name: 'Transit', path: '/corporate-transport', icon: 'bi-building-fill-gear', webIcon: 'bi-building-fill-gear', appIcon: 'directions_bus', isActive: true },
    { name: 'Live Tracking', path: '/live-tracking', icon: 'bi-geo-alt-fill', webIcon: 'bi-geo-alt-fill', appIcon: 'location_searching', isActive: true },
    { name: 'Driver Verification', path: '/vehicle-driver-verification', icon: 'bi-person-check-fill', webIcon: 'bi-person-check-fill', appIcon: 'verified_user', isActive: true },
    // ── Healthcare ERP ────────────────────────────────────────────────────────
    { name: 'Doctors', path: '/doctors', icon: 'bi-heart-pulse-fill', webIcon: 'bi-heart-pulse-fill', appIcon: 'medical_services', isActive: true },
    { name: 'Patients', path: '/patients', icon: 'bi-person-heart', webIcon: 'bi-person-heart', appIcon: 'personal_injury', isActive: true },
    { name: 'Appointments', path: '/appointments', icon: 'bi-calendar-check-fill', webIcon: 'bi-calendar-check-fill', appIcon: 'event_available', isActive: true },
    { name: 'Consultations', path: '/consultations', icon: 'bi-clipboard2-pulse-fill', webIcon: 'bi-clipboard2-pulse-fill', appIcon: 'record_voice_over', isActive: true },
    { name: 'Prescriptions', path: '/prescriptions', icon: 'bi-file-medical-fill', webIcon: 'bi-file-medical-fill', appIcon: 'medication', isActive: true },
    { name: 'Medicine Master', path: '/medicines', icon: 'bi-capsule-pill', webIcon: 'bi-capsule-pill', appIcon: 'local_pharmacy', isActive: true },
    { name: 'Pharmacy POS', path: '/pharmacy-pos', icon: 'bi-bag-plus-fill', webIcon: 'bi-bag-plus-fill', appIcon: 'point_of_sale', isActive: true },
    { name: 'Stock Approvals', path: '/stock-approvals', icon: 'bi-patch-check-fill', webIcon: 'bi-patch-check-fill', appIcon: 'inventory', isActive: true },
    { name: 'Medicine Expiry', path: '/medicine-expiry', icon: 'bi-hourglass-bottom', webIcon: 'bi-hourglass-bottom', appIcon: 'hourglass_bottom', isActive: true },
  ];

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    public perm: PermissionService
  ) {
    this.MenuForm = fb.group({
      name: ['', Validators.required],
      path: ['', Validators.required],
      icon: [''],
      webIcon: [''],
      appIcon: [''],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadMenus();
  }

  get filteredMenus(): any[] {
    if (!this.searchQuery.trim()) return this.menus;
    const q = this.searchQuery.toLowerCase().trim();
    return this.menus.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.path || '').toLowerCase().includes(q) ||
      (m.icon || '').toLowerCase().includes(q) ||
      (m.webIcon || '').toLowerCase().includes(q) ||
      (m.appIcon || '').toLowerCase().includes(q) ||
      (m.status || '').toLowerCase().includes(q)
    );
  }

  get activeCount(): number {
    return this.menus.filter(m => m.isActive).length;
  }

  get inactiveCount(): number {
    return this.menus.filter(m => !m.isActive).length;
  }

  loadMenus() {
    this.commonService.getApi('menus').subscribe({
      next: (res: any) => {
        const rawList = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
        this.menus = rawList.map((item: any) => ({
          ...item,
          webIcon: item.webIcon || item.icon || '',
          appIcon: item.appIcon || item.icon || '',
          status: item.isActive ? 'Active' : 'Inactive'
        }));
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load menus:', err);
      }
    });
  }

  AddNewMenu() {
    this.Menu_Forms = true;
    this.View_Mode = false;
    this.Update_button = false;
    this.SelectedMenuId = null;
    this.SelectedMenu = null;
    this.MenuForm.reset({ isActive: true });
  }

  viewMenu(menu: any) {
    this.SelectedMenu = {
      ...menu,
      webIcon: menu.webIcon || menu.icon || '',
      appIcon: menu.appIcon || menu.icon || ''
    };
    this.View_Mode = true;
    this.Menu_Forms = false;
  }

  closeView() {
    this.View_Mode = false;
    this.SelectedMenu = null;
  }

  editMenu(menu: any) {
    this.SelectedMenuId = menu.id;
    this.Menu_Forms = true;
    this.Update_button = true;
    this.View_Mode = false;

    this.MenuForm.patchValue({
      name: menu.name,
      path: menu.path,
      icon: menu.icon || '',
      webIcon: menu.webIcon || menu.icon || '',
      appIcon: menu.appIcon || menu.icon || '',
      isActive: menu.isActive
    });
  }

  deleteMenu(menu: any) {
    const id = menu?.id || this.SelectedMenuId;
    this.alert.confirm("Are you sure you want to delete this menu?").then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`menus/delete/${id}`).subscribe({
          next: (res: any) => {
            this.alert.success("Menu deleted successfully");
            this.loadMenus();
            if (this.View_Mode) {
              this.closeView();
            }
          },
          error: (err: any) => {
            console.error('Failed to delete menu:', err);
            this.alert.error("Failed to delete menu");
          }
        });
      }
    });
  }

  cancelMenu() {
    this.Menu_Forms = false;
    this.Update_button = false;
    this.SelectedMenuId = null;
    this.SelectedMenu = null;
    this.MenuForm.reset({ isActive: true });
  }

  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const formVal = form.value;
    const payload = {
      ...formVal,
      webIcon: String(formVal.webIcon || formVal.icon || '').trim(),
      appIcon: String(formVal.appIcon || formVal.icon || '').trim(),
      icon: String(formVal.icon || formVal.webIcon || formVal.appIcon || '').trim()
    };
    let path = String(payload.path || '').trim();
    if (path && !path.startsWith('/')) {
      path = '/' + path;
    }
    payload.path = path;
    const nameTrim = String(payload.name || '').trim();

    // Client-side duplicate check for menu name
    const duplicateName = this.menus.find(m =>
      String(m.id) !== String(this.SelectedMenuId) &&
      (m.name || '').toLowerCase().trim() === nameTrim.toLowerCase()
    );
    if (duplicateName) {
      this.alert.warning(`A menu named "${duplicateName.name}" already exists.`, "Duplicate Menu Name");
      return;
    }

    // Client-side duplicate check for route path
    const duplicatePath = this.menus.find(m =>
      String(m.id) !== String(this.SelectedMenuId) &&
      (m.path || '').toLowerCase().trim() === path.toLowerCase()
    );
    if (duplicatePath) {
      this.alert.warning(`A menu with route path "${duplicatePath.path}" already exists.`, "Duplicate Route Path");
      return;
    }

    if (!this.Update_button) {
      this.commonService.postApi('menus', payload).subscribe({
        next: (res: any) => {
          this.alert.success("Menu created successfully");
          this.cancelMenu();
          this.loadMenus();
        },
        error: (err: any) => {
          console.error('Failed to create menu:', err);
        }
      });
    } else {
      this.commonService.putApi(`menus/update/${this.SelectedMenuId}`, payload).subscribe({
        next: (res: any) => {
          this.alert.success("Menu updated successfully");
          this.cancelMenu();
          this.loadMenus();
        },
        error: (err: any) => {
          console.error('Failed to update menu:', err);
        }
      });
    }
  }

  seedDefaultRoutes() {
    const missing = this.defaultRoutes.filter(dr =>
      !this.menus.some(m =>
        (m.path || '').toLowerCase().trim() === dr.path.toLowerCase().trim() ||
        (m.name || '').toLowerCase().trim() === dr.name.toLowerCase().trim()
      )
    );

    if (missing.length === 0) {
      this.alert.success("All default routes are already added");
      return;
    }

    this.alert.confirm(`Are you sure you want to add ${missing.length} default routes?`).then((result) => {
      if (result.isConfirmed) {
        this.commonService.postApi('menus/bulk', missing).subscribe({
          next: (res: any) => {
            this.alert.success(res.message || "Default routes added successfully");
            this.loadMenus();
          },
          error: (err: any) => {
            console.error('Failed to seed routes:', err);
            this.alert.error("Some routes failed to add or an error occurred");
            this.loadMenus();
          }
        });
      }
    });
  }
}

