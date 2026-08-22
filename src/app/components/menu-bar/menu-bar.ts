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
      columnDef: 'icon',
      header: 'Icon'
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
    { name: 'Admin', path: '/admin', icon: 'bi-shield-lock-fill', isActive: true },
    { name: 'Branches', path: '/branch', icon: 'bi-building-fill', isActive: true },
    { name: 'Employees', path: '/employees', icon: 'bi-people-fill', isActive: true },
    { name: 'Role Access', path: '/role-access', icon: 'bi-shield-check', isActive: true },
    { name: 'Roles', path: '/roles', icon: 'bi-key-fill', isActive: true },
    { name: 'Attributes', path: '/product-attribute', icon: 'bi-sliders', isActive: true },
    // { name: 'Attribute Values', path: '/attribute-value', icon: 'bi-tags-fill', isActive: true },
    { name: 'Categories', path: '/category', icon: 'bi-folder-fill', isActive: true },
    { name: 'Products', path: '/product', icon: 'bi-box-seam-fill', isActive: true },
    { name: 'Orders', path: '/orders', icon: 'bi-bag-check-fill', isActive: true },
    { name: 'Coupons', path: '/coupons', icon: 'bi-ticket-perforated-fill', isActive: true },
    { name: 'Audit Logs', path: '/audit-logs', icon: 'bi-clock-history', isActive: true },
    { name: 'Statuses', path: '/status', icon: 'bi-check2-square', isActive: true },
    { name: 'Menu Management', path: '/menubar', icon: 'bi-list-stars', isActive: true },
    { name: 'Alerts', path: '/alerts', icon: 'bi-exclamation-triangle-fill', isActive: true },
    { name: 'Attendance', path: '/attendance', icon: 'bi-calendar-check-fill', isActive: true },
    { name: 'Branch Inventory', path: '/branch-stocks', icon: 'bi-houses-fill', isActive: true },
    { name: 'Stock Control', path: '/stocks', icon: 'bi-boxes', isActive: true },
    { name: 'Payroll', path: '/payroll', icon: 'bi-cash-coin', isActive: true },
    { name: 'Leave Management', path: '/leave', icon: 'bi-airplane-fill', isActive: true },
    { name: 'Deliveries', path: '/delivery-tracking', icon: 'bi-truck', isActive: true },
    { name: 'Payments', path: '/payments', icon: 'bi-credit-card-2-front-fill', isActive: true },
    { name: 'Workforce', path: '/workforce', icon: 'bi-gear-wide-connected', isActive: true },
    { name: 'Invoices', path: '/invoices', icon: 'bi-file-earmark-text-fill', isActive: true },
    { name: 'Approvals', path: '/approvals', icon: 'bi-patch-check-fill', isActive: true },
    { name: 'Profit & Loss', path: '/profit-loss', icon: 'bi-pie-chart-fill', isActive: true },
    { name: 'Plan Admin', path: '/manage-subscription-plans', icon: 'bi-gem', isActive: true },
    { name: 'Subscription', path: '/subscription-plans', icon: 'bi-star-fill', isActive: true },
    { name: 'Billing', path: '/billing-history', icon: 'bi-receipt', isActive: true },
    { name: 'Plan Coupons', path: '/subscription-coupons', icon: 'bi-ticket-detailed-fill', isActive: true },
    { name: 'Checkout', path: '/checkout', icon: 'bi-credit-card-fill', isActive: true },
    { name: 'Calendar', path: '/calendar', icon: 'bi-calendar-event-fill', isActive: true },
    { name: 'Documents', path: '/employee-documents', icon: 'bi-file-earmark-check-fill', isActive: true },
    { name: 'Translations', path: '/translations', icon: 'bi-translate', isActive: true },
    { name: 'POS Terminal', path: '/pos-billing', icon: 'bi-calculator-fill', isActive: true },
    { name: 'Devices', path: '/devices', icon: 'bi-cpu-fill', isActive: true },
    { name: 'Chat', path: '/communication', icon: 'bi-chat-dots-fill', isActive: true },
    { name: 'Meetings', path: '/communication/meetings', icon: 'bi-camera-video-fill', isActive: true },
    { name: 'Mobility Hub', path: '/mobility-dashboard', icon: 'bi-car-front-fill', isActive: true },
    { name: 'Rides', path: '/ride-booking', icon: 'bi-steering-wheel', isActive: true },
    { name: 'Car Rentals', path: '/car-rental', icon: 'bi-key-fill', isActive: true },
    { name: 'Logistics', path: '/parcel-logistics', icon: 'bi-truck-front-fill', isActive: true },
    { name: 'Fleet', path: '/fleet-management', icon: 'bi-radar', isActive: true },
    { name: 'Transit', path: '/corporate-transport', icon: 'bi-building-fill-gear', isActive: true },
    { name: 'Live Tracking', path: '/live-tracking', icon: 'bi-geo-alt-fill', isActive: true },
    { name: 'Driver Verification', path: '/vehicle-driver-verification', icon: 'bi-person-check-fill', isActive: true }
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
    this.SelectedMenu = menu;
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
      icon: menu.icon,
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
    const payload = { ...form.value };
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

