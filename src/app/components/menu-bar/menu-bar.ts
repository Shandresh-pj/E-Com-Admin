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
    { name: 'Admin', path: '/admin', icon: 'archive', isActive: true },
    { name: 'Branch', path: '/branch', icon: 'Badge', isActive: true },
    { name: 'Employee', path: '/employees', icon: 'Badge', isActive: true },
    { name: 'Role Access', path: '/role-access', icon: 'Badge', isActive: true },
    { name: 'Roles', path: '/roles', icon: 'Badge', isActive: true },
    { name: 'Product Attribute', path: '/product-attribute', icon: 'tag', isActive: true },
    { name: 'Attribute Value', path: '/attribute-value', icon: 'list-details', isActive: true },
    { name: 'Category', path: '/category', icon: 'category', isActive: true },
    { name: 'Product', path: '/product', icon: 'box', isActive: true },
    { name: 'Orders', path: '/orders', icon: 'shopping-cart', isActive: true },
    { name: 'Coupons', path: '/coupons', icon: 'ticket', isActive: true },
    { name: 'Audit Logs', path: '/audit-logs', icon: 'clipboard-list', isActive: true },
    { name: 'Status', path: '/status', icon: 'list-check', isActive: true },
    { name: 'Menu Bar', path: '/menubar', icon: 'list-check', isActive: true },
    { name: 'Alerts', path: '/alerts', icon: 'bell', isActive: true },
    { name: 'Attendance', path: '/attendance', icon: 'calendar', isActive: true },
    { name: 'Branch Stocks', path: '/branch-stocks', icon: 'git-merge', isActive: true },
    { name: 'Stocks', path: '/stocks', icon: 'database', isActive: true },
    { name: 'Payroll', path: '/payroll', icon: 'credit-card', isActive: true },
    { name: 'Leave', path: '/leave', icon: 'plane-departure', isActive: true },
    { name: 'Delivery Tracking', path: '/delivery-tracking', icon: 'map-pin', isActive: true },
    { name: 'Payments', path: '/payments', icon: 'credit-card', isActive: true },
    { name: 'Workforce Console', path: '/workforce', icon: 'settings', isActive: true },
    { name: 'Invoice Generator', path: '/invoices', icon: 'file-text', isActive: true },
    { name: 'Approvals', path: '/approvals', icon: 'checkbox', isActive: true },
    { name: 'Profit & Loss', path: '/profit-loss', icon: 'chart-pie', isActive: true },
    { name: 'Manage Plans', path: '/manage-subscription-plans', icon: 'diamond', isActive: true },
    { name: 'Upgrade Plan', path: '/subscription-plans', icon: 'star', isActive: true },
    { name: 'Billing History', path: '/billing-history', icon: 'receipt', isActive: true }
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

