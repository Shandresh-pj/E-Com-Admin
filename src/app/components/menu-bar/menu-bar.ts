import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
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

  MenuForm: FormGroup;
  Menu_Forms: boolean = false;
  View_Mode: boolean = false;
  Update_button: boolean = false;
  menus: any[] = [];
  SelectedMenuId: any = null;
  SelectedMenu: any = null;

  defaultRoutes = [
    { name: 'Admin', path: '/admin', icon: 'bi-shield-lock-fill', isActive: true },
    { name: 'Branch', path: '/branch', icon: 'bi-building-fill', isActive: true },
    { name: 'Employee', path: '/employees', icon: 'bi-people-fill', isActive: true },
    { name: 'Role Access', path: '/role-access', icon: 'bi-shield-check', isActive: true },
    { name: 'Roles', path: '/roles', icon: 'bi-key-fill', isActive: true },
    { name: 'Product Attribute', path: '/product-attribute', icon: 'bi-sliders', isActive: true },
    { name: 'Attribute Value', path: '/attribute-value', icon: 'bi-tags-fill', isActive: true },
    { name: 'Category', path: '/category', icon: 'bi-folder-fill', isActive: true },
    { name: 'Product', path: '/product', icon: 'bi-box-seam-fill', isActive: true },
    { name: 'Orders', path: '/orders', icon: 'bi-bag-check-fill', isActive: true },
    { name: 'Coupons', path: '/coupons', icon: 'bi-ticket-perforated-fill', isActive: true },
    { name: 'Audit Logs', path: '/audit-logs', icon: 'bi-clock-history', isActive: true },
    { name: 'Status', path: '/status', icon: 'bi-check2-square', isActive: true },
    { name: 'Menu Bar', path: '/menubar', icon: 'bi-list-stars', isActive: true },
    { name: 'Alerts', path: '/alerts', icon: 'bi-exclamation-triangle-fill', isActive: true },
    { name: 'Attendance', path: '/attendance', icon: 'bi-calendar-check-fill', isActive: true },
    { name: 'Branch Stocks', path: '/branch-stocks', icon: 'bi-houses-fill', isActive: true },
    { name: 'Stocks', path: '/stocks', icon: 'bi-boxes', isActive: true },
    { name: 'Payroll', path: '/payroll', icon: 'bi-cash-coin', isActive: true },
    { name: 'Leave', path: '/leave', icon: 'bi-airplane-fill', isActive: true },
    { name: 'Delivery Tracking', path: '/delivery-tracking', icon: 'bi-truck', isActive: true },
    { name: 'Payments', path: '/payments', icon: 'bi-credit-card-2-front-fill', isActive: true },
    { name: 'Workforce Console', path: '/workforce', icon: 'bi-gear-wide-connected', isActive: true },
    { name: 'Invoice Generator', path: '/invoices', icon: 'bi-file-earmark-text-fill', isActive: true },
    { name: 'Approvals', path: '/approvals', icon: 'bi-patch-check-fill', isActive: true },
    { name: 'Profit & Loss', path: '/profit-loss', icon: 'bi-pie-chart-fill', isActive: true },
    { name: 'Manage Plans', path: '/manage-subscription-plans', icon: 'bi-gem', isActive: true },
    { name: 'Upgrade Plan', path: '/subscription-plans', icon: 'bi-star-fill', isActive: true },
    { name: 'Billing History', path: '/billing-history', icon: 'bi-receipt', isActive: true },
    { name: 'Subscription Coupons', path: '/subscription-coupons', icon: 'bi-ticket-detailed-fill', isActive: true },
    { name: 'Standard Checkout', path: '/checkout', icon: 'bi-credit-card-fill', isActive: true },
    { name: 'Company Calendar', path: '/calendar', icon: 'bi-calendar-event-fill', isActive: true },
    { name: 'Document Verification', path: '/employee-documents', icon: 'bi-file-earmark-check-fill', isActive: true },
    { name: 'Translation Console', path: '/translations', icon: 'bi-translate', isActive: true },
    { name: 'POS Billing Machine', path: '/pos-billing', icon: 'bi-calculator-fill', isActive: true },
    { name: 'Hardware & Devices', path: '/devices', icon: 'bi-cpu-fill', isActive: true },
    { name: 'Secure Communications', path: '/communication', icon: 'bi-chat-dots-fill', isActive: true },
    { name: 'Team Meetings & Calls', path: '/communication/meetings', icon: 'bi-camera-video-fill', isActive: true },
    { name: 'Mobility Executive Cockpit', path: '/dashboard/mobility-dashboard', icon: 'bi-car-front-fill', isActive: true },
    { name: 'Ride & Taxi Booking', path: '/dashboard/ride-booking', icon: 'bi-steering-wheel', isActive: true },
    { name: 'Car Rental & Subscriptions', path: '/dashboard/car-rental', icon: 'bi-key-fill', isActive: true },
    { name: 'Parcel & Freight Logistics', path: '/dashboard/parcel-logistics', icon: 'bi-truck-front-fill', isActive: true },
    { name: 'Fleet Asset & GPS Control', path: '/dashboard/fleet-management', icon: 'bi-radar', isActive: true },
    { name: 'Corporate & School Transit', path: '/dashboard/corporate-transport', icon: 'bi-building-fill-gear', isActive: true },
    { name: 'Live GPS Telemetry & Replay', path: '/dashboard/live-tracking', icon: 'bi-geo-alt-fill', isActive: true },
    { name: 'KYC & Vehicle Verification', path: '/dashboard/vehicle-driver-verification', icon: 'bi-person-check-fill', isActive: true }
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

  loadMenus() {
    this.commonService.getApi('menus').subscribe({
      next: (res: any) => {
        this.menus = (res?.data || []).map((item: any) => ({
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
    this.MenuForm.reset();
  }

  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const payload = form.value;
    if (!this.Update_button) {
      this.commonService.postApi('menus', payload).subscribe({
        next: (res: any) => {
          this.alert.success("Menu created successfully");
          this.cancelMenu();
          this.loadMenus();
        },
        error: (err: any) => {
          console.error('Failed to create menu:', err);
          this.alert.error("Failed to create menu");
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
          this.alert.error("Failed to update menu");
        }
      });
    }
  }

  seedDefaultRoutes() {
    const missing = this.defaultRoutes.filter(
      dr => !this.menus.some(m => m.path.toLowerCase() === dr.path.toLowerCase())
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

