import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';

// Existing widgets for Admins
import { AppProfitExpensesComponent } from 'src/app/components/profit-expenses/profit-expenses.component';
import { AppTrafficDistributionComponent } from 'src/app/components/traffic-distribution/traffic-distribution.component';
import { AppProductSalesComponent } from 'src/app/components/product-sales/product-sales.component';

// Services
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { UserType } from 'src/app/Securities/Models/role-access';

@Component({
  selector: 'app-starter',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    TablerIconsModule,
    AppProfitExpensesComponent,
    AppTrafficDistributionComponent,
    AppProductSalesComponent,
  ],
  templateUrl: './starter.component.html',
  styleUrl: './starter.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class StarterComponent implements OnInit {
  userRole: string = '';
  currentUser: any = null;
  loading: boolean = false;

  // Stats and Metrics
  totalEmployees = 0;
  presentTodayCount = 0;
  activeShiftsCount = 0;
  lowStockAlertsCount = 0;
  pendingApprovalsCount = 0;
  activeBranchesCount = 0;

  // Branch Manager variables
  branchName = '';
  branchEmployees: any[] = [];
  pendingLeaves: any[] = [];

  // Employee details
  employeeShift: any = null;
  attendanceToday: any = null;
  recentLogs: any[] = [];

  // Customer variables
  customerOrders: any[] = [];
  loyaltyPoints = 250;

  // Audit Logs for Admin
  recentAuditLogs: any[] = [];

  constructor(
    private auth: AuthService,
    private common: CommonService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.userRole = this.auth.getUserType();
    this.loadDashboardData();
  }

  // Formats raw role strings for display (e.g. 'test' -> 'Test', 'Super_Admin' -> 'Super Admin')
  get displayRole(): string {
    if (!this.userRole) return 'Unknown';
    return this.userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get isBranchDashboard(): boolean {
    return this.userRole === UserType.BRANCH_MANAGER || this.userRole === UserType.SHOPKEEPER || this.userRole === 'Branch';
  }

  get isEmployeeDashboard(): boolean {
    return this.userRole === UserType.EMPLOYEE || this.userRole === UserType.DELIVERY_BOY;
  }

  get isCustomerDashboard(): boolean {
    return this.userRole === UserType.CUSTOMER;
  }

  get isAdminDashboard(): boolean {
    // If not matching any other specific dashboard, fallback to Admin to prevent a blank screen
    return !this.isBranchDashboard && !this.isEmployeeDashboard && !this.isCustomerDashboard;
  }

  loadDashboardData() {
    this.loading = true;

    // Load admin metrics
    if (this.userRole === UserType.SUPER_ADMIN || this.userRole === UserType.ADMIN) {
      this.loadAdminMetrics();
    }
    // Load branch metrics
    else if (this.userRole === UserType.BRANCH_MANAGER || this.userRole === UserType.SHOPKEEPER || this.userRole === 'Branch') {
      this.loadBranchMetrics();
    }
    // Load employee/delivery boy metrics
    else if (this.userRole === UserType.EMPLOYEE || this.userRole === UserType.DELIVERY_BOY) {
      this.loadEmployeeMetrics();
    }
    // Load customer metrics
    else if (this.userRole === UserType.CUSTOMER) {
      this.loadCustomerMetrics();
    }
    // Fallback for unknown/test roles so dashboard is not empty
    else {
      this.loadAdminMetrics();
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  // ─── Admin Dashboard Data Loading ──────────────────────────────────────────
  loadAdminMetrics() {
    // Load active branches count
    this.common.getApi('branches').subscribe({
      next: (res: any) => {
        this.activeBranchesCount = res?.data?.length || 0;
        this.cdr.detectChanges();
      }
    });

    // Load employees count
    this.common.getApi('employees').subscribe({
      next: (res: any) => {
        this.totalEmployees = res?.data?.length || 0;
        this.cdr.detectChanges();
      }
    });

    // Load daily attendance report for today
    this.common.getApi('attendance/report/daily').subscribe({
      next: (res: any) => {
        this.presentTodayCount = res?.data?.present_count || 0;
        this.cdr.detectChanges();
      }
    });

    // Load active shifts template count
    this.common.getApi('shifts').subscribe({
      next: (res: any) => {
        this.activeShiftsCount = res?.data?.length || 0;
        this.cdr.detectChanges();
      }
    });

    // Load pending approvals from product controller
    this.common.getApi('products', { status: 'Pending Approval' }).subscribe({
      next: (res: any) => {
        this.pendingApprovalsCount = res?.total || 0;
        this.cdr.detectChanges();
      }
    });

    // Load low stock alerts count
    this.common.getApi('alerts').subscribe({
      next: (res: any) => {
        this.lowStockAlertsCount = res?.data?.length || 0;
        this.cdr.detectChanges();
      }
    });

    // Load recent Audit log logs
    this.common.getApi('audit').subscribe({
      next: (res: any) => {
        this.recentAuditLogs = (res?.data || []).slice(0, 5);
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Branch Manager Metrics Loading ──────────────────────────────────────────
  loadBranchMetrics() {
    const branchId = this.currentUser?.branchId || this.currentUser?.branch_id;

    if (branchId) {
      // Find branch details
      this.common.getApi(`branches/${branchId}`).subscribe({
        next: (res: any) => {
          this.branchName = res?.data?.name || `Branch #${branchId}`;
          this.cdr.detectChanges();
        }
      });
    }

    // Get live dashboard details for branch
    this.common.getApi('attendance/dashboard', { branch_id: branchId }).subscribe({
      next: (res: any) => {
        this.presentTodayCount = res?.data?.present || 0;
        this.cdr.detectChanges();
      }
    });

    // Get branch employees
    this.common.getApi('employees').subscribe({
      next: (res: any) => {
        const list = res?.data || [];
        this.branchEmployees = branchId ? list.filter((e: any) => e.branch_id === branchId) : list;
        this.totalEmployees = this.branchEmployees.length;
        this.cdr.detectChanges();
      }
    });

    // Get leave requests
    this.common.getApi('leave').subscribe({
      next: (res: any) => {
        const leaves = res?.data || [];
        this.pendingLeaves = leaves.filter((l: any) => l.status === 'PENDING').slice(0, 5);
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Employee personal dashboard loading ─────────────────────────────────────
  loadEmployeeMetrics() {
    const employeeId = this.currentUser?.userId || this.currentUser?.id;
    if (!employeeId) return;

    // Get employee active shift details
    this.common.getApi(`shifts/employee/${employeeId}`).subscribe({
      next: (res: any) => {
        this.employeeShift = res?.data?.shift || null;
        this.cdr.detectChanges();
      }
    });

    // Get personal attendance for today
    this.common.getApi('attendance/today', { employee_id: employeeId }).subscribe({
      next: (res: any) => {
        const att = res?.data?.attendance || null;
        if (att) {
          att.check_in = this.formatTime12h(att.check_in);
        }
        this.attendanceToday = att;
        this.cdr.detectChanges();
      }
    });

    // Get employee history log list
    this.common.getApi(`attendance/employee/${employeeId}`, { limit: 5 }).subscribe({
      next: (res: any) => {
        this.recentLogs = (res?.data || []).map((log: any) => ({
          ...log,
          attendance_date: this.formatDateDDMMYYYY(log.attendance_date),
          check_in: this.formatTime12h(log.check_in),
          check_out: this.formatTime12h(log.check_out),
          total_hours: log.total_minutes ? `${Math.floor(log.total_minutes / 60)}h ${log.total_minutes % 60}m` : '-'
        })).slice(0, 5);
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Customer Shopping Dashboard loading ─────────────────────────────────────
  loadCustomerMetrics() {
    // Get customer active order list
    this.common.getApi('orders').subscribe({
      next: (res: any) => {
        this.customerOrders = (res?.data || []).slice(0, 5);
        this.cdr.detectChanges();
      }
    });
  }

  // Helper to format date YYYY-MM-DD to DD-MM-YYYY
  formatDateDDMMYYYY(dateStr: any): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch (e) {}
    return dateStr;
  }

  // Helper to format 24h time to 12h AM/PM
  formatTime12h(timeStr: any): string {
    if (!timeStr) return '-';
    try {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1].padStart(2, '0');
        const seconds = parts[2] ? parts[2].substring(0, 2).padStart(2, '0') : '00';
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // hour 0 should be 12
        return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
      }
    } catch (e) {}
    return timeStr;
  }
}