import { NavItem } from './nav-item/nav-item';
import { UserType } from 'src/app/Securities/Models/role-access';

const SA = UserType.SUPER_ADMIN;
const A = UserType.ADMIN;
const BR = UserType.BRANCH;
const BM = UserType.BRANCH_MANAGER;
const SK = UserType.SHOPKEEPER;
const DB = UserType.DELIVERY_BOY;
const EM = UserType.EMPLOYEE;

export const navItems: NavItem[] = [
  {
    navCap: 'Home',
  },
  {
    displayName: 'Dashboard',
    iconName: 'layout-grid-add',
    route: '/dashboard',
    bgcolor: 'primary',
  },
  {
    navCap: 'Admin',
    roles: [SA, A],
  },
  {
    displayName: 'App Admin',
    iconName: 'shield',
    route: '/admin',
    bgcolor: 'primary',
    roles: [SA, A],
  },
  {
    displayName: 'CRM Contacts',
    iconName: 'users',
    route: '/crm-contacts',
    bgcolor: 'primary',
    roles: [SA, A],
  },
  {
    navCap: 'Branch',
    roles: [SA, A],
  },
  {
    displayName: 'App Branch',
    iconName: 'building-store',
    route: '/branch',
    bgcolor: 'warning',
    roles: [SA, A],
  },
  {
    navCap: 'Employees',
    roles: [SA, A, BM],
  },
  {
    displayName: 'App Employee',
    iconName: 'user-check',
    route: '/employees',
    bgcolor: 'success',
    roles: [SA, A, BM],
  },
  {
    navCap: 'Roles',
    roles: [SA],
  },
  {
    displayName: 'App Role Access',
    iconName: 'lock-access',
    route: '/role-access',
    bgcolor: 'warning',
    roles: [SA],
  },
  {
    displayName: 'App Roles',
    iconName: 'key',
    route: '/roles',
    bgcolor: 'success',
    roles: [SA],
  },

  { navCap: 'Catalog', roles: [SA, A, BM, SK] },
  {
    displayName: 'Product Attribute',
    iconName: 'tag',
    route: '/product-attribute',
    bgcolor: 'primary',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Attribute Value',
    iconName: 'list-details',
    route: '/attribute-value',
    bgcolor: 'warning',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Category',
    iconName: 'category',
    route: '/category',
    bgcolor: 'success',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Product',
    iconName: 'box',
    route: '/product',
    bgcolor: 'error',
    roles: [SA, A, BM, SK],
  },

  { navCap: 'Sales', roles: [SA, A, BM, SK] },
  {
    displayName: 'Orders',
    iconName: 'shopping-cart',
    route: '/orders',
    bgcolor: 'primary',
    roles: [SA, A, BM, SK],
  },
  {
    displayName: 'Coupons',
    iconName: 'ticket',
    route: '/coupons',
    bgcolor: 'error',
    roles: [SA, A, BM, SK],
  },
  {
    displayName: 'Invoice Generator',
    iconName: 'file-text',
    route: '/invoices',
    bgcolor: 'warning',
    roles: [SA, A, BM, SK]
  },
  {
    displayName: 'Manage Plans',
    iconName: 'diamond',
    route: '/manage-subscription-plans',
    bgcolor: 'secondary',
    roles: [SA, A]
  },
  {
    displayName: 'Upgrade Plan',
    iconName: 'premium-rights',
    route: '/subscription-plans',
    bgcolor: 'primary',
    roles: [SA, A, BM]
  },
  {
    displayName: 'Billing & Invoices',
    iconName: 'receipt',
    route: '/billing-history',
    bgcolor: 'success',
    roles: [SA, A, BM, SK]
  },
  {
    displayName: 'Subscription Coupons',
    iconName: 'ticket',
    route: '/subscription-coupons',
    bgcolor: 'warning',
    roles: [SA, A]
  },
  {
    displayName: 'Payment Checkout',
    iconName: 'credit-card',
    route: '/checkout',
    bgcolor: 'info',
    roles: [SA, A, BM, SK]
  },

  { navCap: 'Audit', roles: [SA, A] },
  {
    displayName: 'Audit Logs',
    iconName: 'clipboard-list',
    route: '/audit-logs',
    bgcolor: 'error',
    roles: [SA, A],
  },

  { navCap: 'Inventory & Stocks', roles: [SA, A, BM, SK] },
  {
    displayName: 'Stocks',
    iconName: 'box-seam',
    route: '/stocks',
    bgcolor: 'primary',
    roles: [SA, A, BM, SK],
  },
  {
    displayName: 'Branch Stocks',
    iconName: 'building-warehouse',
    route: '/branch-stocks',
    bgcolor: 'warning',
    roles: [SA, A, BM],
  },

  { navCap: 'Logistics & Finance', roles: [SA, A, BM, SK] },
  {
    displayName: 'Delivery Tracking',
    iconName: 'truck-delivery',
    route: '/delivery-tracking',
    bgcolor: 'primary',
    roles: [SA, A, BM, DB],
  },
  {
    displayName: 'Payments',
    iconName: 'credit-card',
    route: '/payments',
    bgcolor: 'success',
    roles: [SA, A, BM, SK],
  },

  { navCap: 'Workforce', roles: [SA, A, BM] },
  {
    displayName: 'Workforce Console',
    iconName: 'settings',
    route: '/workforce',
    bgcolor: 'primary',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Workforce Requests',
    iconName: 'file-check',
    route: '/workforce-requests',
    bgcolor: 'warning',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Attendance',
    iconName: 'calendar-stats',
    route: '/attendance',
    bgcolor: 'success',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Leave Management',
    iconName: 'calendar-off',
    route: '/leave',
    bgcolor: 'warning',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Payroll',
    iconName: 'cash',
    route: '/payroll',
    bgcolor: 'primary',
    roles: [SA, A, BM],
  },

  { navCap: 'Operations & Workflows', roles: [SA, A, BM, SK, EM] },
  {
    displayName: 'Workflow Approvals',
    iconName: 'checkup-list',
    route: '/approvals',
    bgcolor: 'primary',
    roles: [SA, A, BM, SK, EM],
  },
  {
    displayName: 'Alerts',
    iconName: 'alert-circle',
    route: '/alerts',
    bgcolor: 'error',
  },
  {
    displayName: 'Notifications',
    iconName: 'bell',
    route: '/notifications',
    bgcolor: 'warning',
  },

  { navCap: 'Settings' },
  {
    displayName: 'Profile',
    iconName: 'user',
    route: '/profile',
    bgcolor: 'primary',
  },
  {
    displayName: 'Menu Bar',
    iconName: 'layout-navbar',
    route: '/menu-bar',
    bgcolor: 'warning',
    roles: [SA, A],
  },
  {
    displayName: 'Status',
    iconName: 'list-check',
    route: '/status',
    bgcolor: 'warning',
    roles: [SA, A],
  },
  {
    displayName: 'Change Password',
    iconName: 'lock',
    route: '/change-password',
    bgcolor: 'success',
  },
];
