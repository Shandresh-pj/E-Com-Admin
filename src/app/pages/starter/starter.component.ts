import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';

// Existing widgets for Admins
import { AppProfitExpensesComponent } from 'src/app/components/profit-expenses/profit-expenses.component';
import { AppTrafficDistributionComponent } from 'src/app/components/traffic-distribution/traffic-distribution.component';
import { AppProductSalesComponent } from 'src/app/components/product-sales/product-sales.component';
import { SubscriptionPlansComponent } from '../subscription-plans/subscription-plans.component';
import { SubscriptionWidgetComponent } from 'src/app/components/subscription-widget/subscription-widget.component';

import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';

export interface RoleOption {
  id: string;
  name: string;
  icon: string;
  category: 'admin' | 'branch' | 'doctor' | 'healthcare_admin' | 'pharmacy' | 'employee' | 'customer';
  badgeColor: string;
  subtitle?: string;
}

export interface QuickLaunchItem {
  label: string;
  icon: string;
  route: string;
  colorClass: string;
  /** If true, always show for Super Admin regardless of permissions */
  adminOnly?: boolean;
}

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
    SubscriptionPlansComponent,
    SubscriptionWidgetComponent
  ],
  templateUrl: './starter.component.html',
  styleUrl: './starter.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarterComponent implements OnInit {
  userRole: string = '';
  activeRolePerspective: string = ''; // Supports role preview switcher
  currentUser: any = null;
  loading: boolean = false;

  // Available Role Perspectives for Preview Console
  availableRoles: RoleOption[] = [
    { id: 'Super_Admin', name: 'Executive Admin', icon: 'shield', category: 'admin', badgeColor: 'indigo', subtitle: 'Full System Control' },
    { id: 'Branch_Manager', name: 'Branch Manager', icon: 'storefront', category: 'branch', badgeColor: 'sky', subtitle: 'Store Operations' },
    { id: 'Doctor', name: 'Doctor (Clinical)', icon: 'medical_services', category: 'doctor', badgeColor: 'emerald', subtitle: 'Patients & Rx' },
    { id: 'Hospital_Admin', name: 'Healthcare Admin', icon: 'local_hospital', category: 'healthcare_admin', badgeColor: 'purple', subtitle: 'Hospital Overview' },
    { id: 'Pharmacist', name: 'Pharmacy POS', icon: 'medication', category: 'pharmacy', badgeColor: 'amber', subtitle: 'Dispense & Stocks' },
    { id: 'Employee', name: 'Staff Employee', icon: 'badge', category: 'employee', badgeColor: 'teal', subtitle: 'Shifts & Attendance' }
  ];

  // ─── All possible Quick Launch items across the system ──────────────────────
  private readonly ALL_LAUNCH_ITEMS: QuickLaunchItem[] = [
    // Admin / Core
    { label: 'Role Access',    icon: 'security',              route: '/role-access',       colorClass: 'q-violet' },
    { label: 'Workforce',      icon: 'manage_accounts',       route: '/workforce',         colorClass: 'q-indigo' },
    { label: 'Attendance',     icon: 'history',               route: '/attendance',        colorClass: 'q-emerald' },
    { label: 'Employees',      icon: 'badge',                 route: '/employees',         colorClass: 'q-amber' },
    { label: 'Payroll',        icon: 'payments',              route: '/payroll',           colorClass: 'q-cyan' },
    { label: 'POS Billing',    icon: 'point_of_sale',         route: '/pos-billing',       colorClass: 'q-purple' },
    { label: 'Products',       icon: 'inventory_2',           route: '/product',           colorClass: 'q-rose' },
    { label: 'Branches',       icon: 'storefront',            route: '/branch',            colorClass: 'q-sky' },
    { label: 'Doctors',        icon: 'medical_services',      route: '/doctors',           colorClass: 'q-emerald' },
    { label: 'Pharmacy',       icon: 'medication',            route: '/pharmacy-pos',      colorClass: 'q-amber' },
    { label: 'Plans',          icon: 'diamond',               route: '/subscription-plans', colorClass: 'q-gold', adminOnly: true },
    { label: 'Audit Logs',     icon: 'fact_check',            route: '/audit-logs',        colorClass: 'q-teal' },
    { label: 'Invoices',       icon: 'description',           route: '/invoices',          colorClass: 'q-indigo' },
    { label: 'Orders',         icon: 'shopping_cart',         route: '/orders',            colorClass: 'q-rose' },
    { label: 'Approvals',      icon: 'approval',              route: '/approvals',         colorClass: 'q-violet' },
    { label: 'Leave',          icon: 'event_busy',            route: '/leave',             colorClass: 'q-amber' },
    { label: 'Patients',       icon: 'personal_injury',       route: '/patients',          colorClass: 'q-sky' },
    { label: 'Appointments',   icon: 'event_available',       route: '/appointments',      colorClass: 'q-emerald' },
    { label: 'Prescriptions',  icon: 'medication',            route: '/prescriptions',     colorClass: 'q-teal' },
    { label: 'Medicine',       icon: 'local_pharmacy',        route: '/medicines',         colorClass: 'q-purple' },
    { label: 'Expiry',         icon: 'hourglass_bottom',      route: '/medicine-expiry',   colorClass: 'q-rose' },
    { label: 'Stocks',         icon: 'warehouse',             route: '/stocks',            colorClass: 'q-amber' },
    { label: 'Branch Stock',   icon: 'store',                 route: '/branch-stocks',     colorClass: 'q-sky' },
    { label: 'Stock Approv.',  icon: 'inventory',             route: '/stock-approvals',   colorClass: 'q-violet' },
    { label: 'Consultations',  icon: 'record_voice_over',     route: '/consultations',     colorClass: 'q-cyan' },
    { label: 'App Admin',      icon: 'admin_panel_settings',  route: '/admin',             colorClass: 'q-indigo', adminOnly: true },
    { label: 'Payments',       icon: 'account_balance_wallet', route: '/payments',         colorClass: 'q-gold' },
    { label: 'CRM',            icon: 'contacts',              route: '/crm-contacts',      colorClass: 'q-sky' },
    { label: 'Profit & Loss',  icon: 'monetization_on',       route: '/profit-loss',       colorClass: 'q-emerald' },
    { label: 'Profile',        icon: 'person',                route: '/profile',           colorClass: 'q-teal' },
  ];

  // ─── Role-specific Quick Launch sets (subset of ALL_LAUNCH_ITEMS) ────────────
  private readonly ROLE_LAUNCH_ROUTES: Record<string, string[]> = {
    admin: [
      '/role-access', '/workforce', '/attendance', '/employees', '/payroll',
      '/pos-billing', '/product', '/branch', '/doctors', '/pharmacy-pos',
      '/subscription-plans', '/audit-logs'
    ],
    branch: [
      '/attendance', '/branch-stocks', '/pos-billing', '/leave',
      '/employees', '/payroll', '/orders', '/invoices', '/profile'
    ],
    doctor: [
      '/appointments', '/prescriptions', '/patients', '/consultations',
      '/medicines', '/profile', '/attendance'
    ],
    healthcare_admin: [
      '/doctors', '/patients', '/appointments', '/pharmacy-pos',
      '/medicines', '/prescriptions', '/consultations', '/medicine-expiry',
      '/stock-approvals', '/profile'
    ],
    pharmacy: [
      '/pharmacy-pos', '/prescriptions', '/medicines', '/medicine-expiry',
      '/stock-approvals', '/branch-stocks', '/payments', '/profile'
    ],
    employee: [
      '/attendance', '/leave', '/payroll', '/profile', '/workforce-requests',
      '/notifications', '/change-password'
    ],
    customer: [
      '/orders', '/profile', '/notifications', '/change-password'
    ]
  };

  // Common Stats and Metrics
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

  // Doctor Clinical variables
  todayAppointmentsCount = 0;
  pendingPrescriptionsCount = 0;
  completedConsultationsCount = 0;
  waitingPatientsCount = 0;
  doctorAppointmentsList: any[] = [];

  // Healthcare Admin variables
  activeDoctorsCount = 0;
  todayTotalPatientsCount = 0;
  pharmacyDailyRevenue = 0;
  bedOccupancyRate = 0;
  activeDoctorsList: any[] = [];

  // Pharmacy / POS variables
  pendingDispenseCount = 0;
  lowStockMedicinesCount = 0;
  expiringMedicinesCount = 0;
  todayPosSalesCount = 0;
  pendingPrescriptionsList: any[] = [];
  expiringMedicinesList: any[] = [];

  // Employee details
  employeeShift: any = null;
  attendanceToday: any = null;
  recentLogs: any[] = [];

  // Customer variables
  customerOrders: any[] = [];
  loyaltyPoints = 0;

  // Audit Logs for Admin
  recentAuditLogs: any[] = [];

  constructor(
    private auth: AuthService,
    private common: CommonService,
    private cdr: ChangeDetectorRef,
    public perm: PermissionService
  ) { }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.userRole = this.auth.getUserType() || 'Super_Admin';
    this.activeRolePerspective = this.userRole;
    this.loadDashboardData();
  }

  // ─── Time-Based Greeting ──────────────────────────────────────────────────
  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  get greetingEmoji(): string {
    const h = new Date().getHours();
    if (h < 12) return '🌅';
    if (h < 17) return '☀️';
    return '🌙';
  }

  get currentDateStr(): string {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // ─── User Avatar Initials ─────────────────────────────────────────────────
  get userInitials(): string {
    const name = this.currentUser?.name || 'User';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // ─── Role Color Class for Banner ──────────────────────────────────────────
  get roleBannerClass(): string {
    if (this.isSuperAdmin || this.isAdminDashboard) return 'role-banner--indigo';
    if (this.isBranchDashboard) return 'role-banner--sky';
    if (this.isDoctorDashboard) return 'role-banner--emerald';
    if (this.isHealthcareAdminDashboard) return 'role-banner--fuchsia';
    if (this.isPharmacyDashboard) return 'role-banner--amber';
    if (this.isEmployeeDashboard) return 'role-banner--teal';
    if (this.isCustomerDashboard) return 'role-banner--violet';
    return 'role-banner--indigo';
  }

  get roleIconName(): string {
    if (this.isSuperAdmin || this.isAdminDashboard) return 'shield';
    if (this.isBranchDashboard) return 'storefront';
    if (this.isDoctorDashboard) return 'medical_services';
    if (this.isHealthcareAdminDashboard) return 'local_hospital';
    if (this.isPharmacyDashboard) return 'local_pharmacy';
    if (this.isEmployeeDashboard) return 'badge';
    if (this.isCustomerDashboard) return 'shopping_bag';
    return 'verified_user';
  }

  // ─── Permission-Gated Quick Launch ───────────────────────────────────────
  get quickLaunchItems(): QuickLaunchItem[] {
    let roleKey = 'admin';
    if (this.isBranchDashboard)         roleKey = 'branch';
    else if (this.isDoctorDashboard)    roleKey = 'doctor';
    else if (this.isHealthcareAdminDashboard) roleKey = 'healthcare_admin';
    else if (this.isPharmacyDashboard)  roleKey = 'pharmacy';
    else if (this.isEmployeeDashboard)  roleKey = 'employee';
    else if (this.isCustomerDashboard)  roleKey = 'customer';

    const roleRoutes = this.ROLE_LAUNCH_ROUTES[roleKey] || this.ROLE_LAUNCH_ROUTES['admin'];

    return this.ALL_LAUNCH_ITEMS.filter(item => {
      if (item.adminOnly && this.isSuperAdmin) return roleRoutes.includes(item.route);
      if (!roleRoutes.includes(item.route)) return false;
      return this.isSuperAdmin || this.perm.hasPagePermission(item.route);
    });
  }

  setRolePerspective(roleId: string) {
    this.activeRolePerspective = roleId;
    this.loadDashboardData();
  }

  resetRolePerspective() {
    this.activeRolePerspective = this.userRole;
    this.loadDashboardData();
  }

  get isPreviewMode(): boolean {
    return this.normalizedRole !== (this.userRole || '').toLowerCase().replace(/[\s_]+/g, '');
  }

  get displayRole(): string {
    const roleToDisplay = this.activeRolePerspective || this.userRole || 'Enterprise User';
    return roleToDisplay.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get normalizedRole(): string {
    return (this.activeRolePerspective || this.userRole || '').toLowerCase().replace(/[\s_]+/g, '');
  }

  get isSuperAdmin(): boolean {
    return (this.auth.isSuperAdmin() && !this.isPreviewMode) || this.normalizedRole === 'superadmin';
  }

  get isActualSuperAdmin(): boolean {
    const rawRole = (this.userRole || '').toLowerCase().replace(/[\s_]+/g, '');
    return this.auth.isSuperAdmin() || rawRole === 'superadmin';
  }

  get isBranchDashboard(): boolean {
    return ['branchmanager', 'branch', 'shopkeeper'].includes(this.normalizedRole);
  }

  get isDoctorDashboard(): boolean {
    return ['doctor'].includes(this.normalizedRole);
  }

  get isHealthcareAdminDashboard(): boolean {
    return ['hospitaladmin', 'clinicadmin'].includes(this.normalizedRole);
  }

  get isPharmacyDashboard(): boolean {
    return ['pharmacist', 'inventorymanager', 'cashier', 'accountant'].includes(this.normalizedRole);
  }

  get isEmployeeDashboard(): boolean {
    return ['employee', 'deliveryboy'].includes(this.normalizedRole);
  }

  get isCustomerDashboard(): boolean {
    return this.normalizedRole === 'customer';
  }

  get isAdminDashboard(): boolean {
    return !this.isBranchDashboard &&
           !this.isDoctorDashboard &&
           !this.isHealthcareAdminDashboard &&
           !this.isPharmacyDashboard &&
           !this.isEmployeeDashboard &&
           !this.isCustomerDashboard;
  }

  loadDashboardData() {
    this.loading = true;

    if (this.isBranchDashboard) {
      this.loadBranchMetrics();
    } else if (this.isDoctorDashboard) {
      this.loadDoctorMetrics();
    } else if (this.isHealthcareAdminDashboard) {
      this.loadHealthcareAdminMetrics();
    } else if (this.isPharmacyDashboard) {
      this.loadPharmacyMetrics();
    } else if (this.isEmployeeDashboard) {
      this.loadEmployeeMetrics();
    } else if (this.isCustomerDashboard) {
      this.loadCustomerMetrics();
    } else {
      this.loadAdminMetrics();
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  // ─── Admin Dashboard Data Loading ──────────────────────────────────────────
  loadAdminMetrics() {
    if (this.perm.hasPagePermission('/branch') || this.isSuperAdmin) {
      this.common.getApi('branches').subscribe({
        next: (res: any) => {
          this.activeBranchesCount = res?.total ?? (Array.isArray(res?.data) ? res.data.length : (Array.isArray(res) ? res.length : 0));
          this.cdr.detectChanges();
        },
        error: () => { this.activeBranchesCount = 0; this.cdr.detectChanges(); }
      });
    } else {
      this.activeBranchesCount = 0;
    }

    if (this.perm.hasPagePermission('/employees') || this.isSuperAdmin) {
      this.common.getApi('employees').subscribe({
        next: (res: any) => {
          this.totalEmployees = res?.total ?? (Array.isArray(res?.data) ? res.data.length : (Array.isArray(res) ? res.length : 0));
          this.cdr.detectChanges();
        },
        error: () => { this.totalEmployees = 0; this.cdr.detectChanges(); }
      });
    } else {
      this.totalEmployees = 0;
    }

    if (this.perm.hasPagePermission('/attendance') || this.isSuperAdmin) {
      this.common.getApi('attendance/report/daily').subscribe({
        next: (res: any) => {
          this.presentTodayCount = res?.data?.present_count ?? res?.present_count ?? 0;
          this.cdr.detectChanges();
        },
        error: () => { this.presentTodayCount = 0; this.cdr.detectChanges(); }
      });
    } else {
      this.presentTodayCount = 0;
    }

    if (this.perm.hasPagePermission('/workforce') || this.perm.hasPagePermission('/attendance') || this.isSuperAdmin) {
      this.common.getApi('shifts').subscribe({
        next: (res: any) => {
          this.activeShiftsCount = res?.total ?? (Array.isArray(res?.data) ? res.data.length : (Array.isArray(res) ? res.length : 0));
          this.cdr.detectChanges();
        },
        error: () => { this.activeShiftsCount = 0; this.cdr.detectChanges(); }
      });
    } else {
      this.activeShiftsCount = 0;
    }

    if (this.perm.canApproveProducts() || this.isSuperAdmin) {
      this.common.getApi('products', { status: 'Pending Approval' }).subscribe({
        next: (res: any) => {
          this.pendingApprovalsCount = res?.total ?? (Array.isArray(res?.data) ? res.data.length : 0);
          this.cdr.detectChanges();
        },
        error: () => { this.pendingApprovalsCount = 0; this.cdr.detectChanges(); }
      });
    } else {
      this.pendingApprovalsCount = 0;
    }

    if (this.perm.hasPagePermission('/alerts') || this.isSuperAdmin) {
      this.common.getApi('alerts').subscribe({
        next: (res: any) => {
          this.lowStockAlertsCount = res?.total ?? (Array.isArray(res?.data) ? res.data.length : (Array.isArray(res) ? res.length : 0));
          this.cdr.detectChanges();
        },
        error: () => { this.lowStockAlertsCount = 0; this.cdr.detectChanges(); }
      });
    } else {
      this.lowStockAlertsCount = 0;
    }

    if (this.perm.hasPagePermission('/audit-logs') || this.isSuperAdmin) {
      this.common.getApi('audit').subscribe({
        next: (res: any) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          this.recentAuditLogs = list.slice(0, 5);
          this.cdr.detectChanges();
        },
        error: () => {
          this.recentAuditLogs = [];
          this.cdr.detectChanges();
        }
      });
    } else {
      this.recentAuditLogs = [];
    }
  }

  // ─── Branch Manager Metrics Loading ──────────────────────────────────────────
  loadBranchMetrics() {
    const branchId = this.currentUser?.branchId || this.currentUser?.branch_id;

    if (branchId) {
      this.common.getApi(`branches/${branchId}`).subscribe({
        next: (res: any) => {
          this.branchName = res?.data?.name || res?.name || `Branch #${branchId}`;
          this.cdr.detectChanges();
        },
        error: () => { this.branchName = `Branch #${branchId}`; this.cdr.detectChanges(); }
      });
    } else {
      this.branchName = 'Central Branch';
    }

    this.common.getApi('attendance/dashboard', { branch_id: branchId }).subscribe({
      next: (res: any) => {
        this.presentTodayCount = res?.data?.present ?? res?.present ?? 0;
        this.cdr.detectChanges();
      },
      error: () => { this.presentTodayCount = 0; this.cdr.detectChanges(); }
    });

    this.common.getApi('employees').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.branchEmployees = branchId ? list.filter((e: any) => e.branch_id === branchId) : list;
        this.totalEmployees = this.branchEmployees.length;
        this.cdr.detectChanges();
      },
      error: () => { this.totalEmployees = 0; this.branchEmployees = []; this.cdr.detectChanges(); }
    });

    this.common.getApi('leave').subscribe({
      next: (res: any) => {
        const leaves = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const filtered = leaves.filter((l: any) => String(l.status).toUpperCase() === 'PENDING');
        this.pendingLeaves = filtered.slice(0, 5);
        this.cdr.detectChanges();
      },
      error: () => {
        this.pendingLeaves = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Doctor Metrics Loading ──────────────────────────────────────────────────
  loadDoctorMetrics() {
    const doctorId = this.currentUser?.doctorId || this.currentUser?.doctor_id || this.currentUser?.id;

    this.common.getApi('healthcare/appointments', { doctor_id: doctorId }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.doctorAppointmentsList = list.slice(0, 5);
        this.todayAppointmentsCount = res?.total ?? list.length;
        this.waitingPatientsCount = list.filter((a: any) => String(a.status).toUpperCase() === 'WAITING').length;
        this.completedConsultationsCount = list.filter((a: any) => String(a.status).toUpperCase() === 'COMPLETED').length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.doctorAppointmentsList = [];
        this.todayAppointmentsCount = 0;
        this.waitingPatientsCount = 0;
        this.completedConsultationsCount = 0;
        this.cdr.detectChanges();
      }
    });

    this.common.getApi('healthcare/prescriptions', { doctor_id: doctorId }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.pendingPrescriptionsCount = res?.total ?? list.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.pendingPrescriptionsCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Healthcare Admin Metrics Loading ────────────────────────────────────────
  loadHealthcareAdminMetrics() {
    this.common.getApi('healthcare/doctors').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.activeDoctorsList = list.slice(0, 5);
        this.activeDoctorsCount = res?.total ?? list.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.activeDoctorsList = [];
        this.activeDoctorsCount = 0;
        this.cdr.detectChanges();
      }
    });

    this.common.getApi('healthcare/patients').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.todayTotalPatientsCount = res?.total ?? list.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.todayTotalPatientsCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Pharmacy Metrics Loading ────────────────────────────────────────────────
  loadPharmacyMetrics() {
    this.common.getApi('healthcare/prescriptions', { status: 'PENDING' }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.pendingPrescriptionsList = list.slice(0, 5);
        this.pendingDispenseCount = res?.total ?? list.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.pendingPrescriptionsList = [];
        this.pendingDispenseCount = 0;
        this.cdr.detectChanges();
      }
    });

    this.common.getApi('medicine-expiry').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.expiringMedicinesList = list.slice(0, 5);
        this.expiringMedicinesCount = res?.total ?? list.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.expiringMedicinesList = [];
        this.expiringMedicinesCount = 0;
        this.cdr.detectChanges();
      }
    });

    this.common.getApi('medicines', { low_stock: true }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.lowStockMedicinesCount = res?.total ?? list.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.lowStockMedicinesCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Employee Metrics Loading ────────────────────────────────────────────────
  loadEmployeeMetrics() {
    const employeeId = this.currentUser?.userId || this.currentUser?.id;

    if (employeeId) {
      this.common.getApi(`shifts/employee/${employeeId}`).subscribe({
        next: (res: any) => {
          this.employeeShift = res?.data?.shift || res?.data || null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.employeeShift = null;
          this.cdr.detectChanges();
        }
      });

      this.common.getApi('attendance/today', { employee_id: employeeId }).subscribe({
        next: (res: any) => {
          const att = res?.data?.attendance || res?.data || null;
          if (att && att.check_in) {
            att.check_in = this.formatTime12h(att.check_in);
          }
          this.attendanceToday = att;
          this.cdr.detectChanges();
        },
        error: () => {
          this.attendanceToday = null;
          this.cdr.detectChanges();
        }
      });

      this.common.getApi(`attendance/employee/${employeeId}`, { limit: 5 }).subscribe({
        next: (res: any) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          this.recentLogs = list.map((log: any) => ({
            ...log,
            attendance_date: this.formatDateDDMMYYYY(log.attendance_date),
            check_in: this.formatTime12h(log.check_in),
            check_out: this.formatTime12h(log.check_out),
            total_hours: log.total_minutes ? `${Math.floor(log.total_minutes / 60)}h ${log.total_minutes % 60}m` : '-'
          })).slice(0, 5);
          this.cdr.detectChanges();
        },
        error: () => {
          this.recentLogs = [];
          this.cdr.detectChanges();
        }
      });
    } else {
      this.employeeShift = null;
      this.attendanceToday = null;
      this.recentLogs = [];
    }
  }

  // ─── Customer Metrics Loading ────────────────────────────────────────────────
  loadCustomerMetrics() {
    this.common.getApi('orders').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.customerOrders = list.slice(0, 5);
        this.cdr.detectChanges();
      },
      error: () => {
        this.customerOrders = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Helpers to format dates and times
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
        hours = hours ? hours : 12;
        return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
      }
    } catch (e) {}
    return timeStr;
  }

  trackByRoute(i: number, item: QuickLaunchItem) { return item.route; }
  trackByIndex(i: number) { return i; }
}