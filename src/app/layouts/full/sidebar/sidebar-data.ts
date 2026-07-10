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
    route: '/components/admin',
    bgcolor: 'primary',
    roles: [SA, A],
  },
  {
    displayName: 'CRM Contacts',
    iconName: 'users',
    route: '/components/crm-contacts',
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
    route: '/components/branch',
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
    route: '/components/employees',
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
    route: '/components/role-access',
    bgcolor: 'warning',
    roles: [SA],
  },
  {
    displayName: 'App Roles',
    iconName: 'key',
    route: '/components/roles',
    bgcolor: 'success',
    roles: [SA],
  },

  { navCap: 'Catalog', roles: [SA, A, BM, SK] },
  {
    displayName: 'Product Attribute',
    iconName: 'tag',
    route: '/components/product-attribute',
    bgcolor: 'primary',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Attribute Value',
    iconName: 'list-details',
    route: '/components/attribute-value',
    bgcolor: 'warning',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Category',
    iconName: 'category',
    route: '/components/category',
    bgcolor: 'success',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Product',
    iconName: 'box',
    route: '/components/product',
    bgcolor: 'error',
    roles: [SA, A, BM, SK],
  },

  { navCap: 'Sales', roles: [SA, A, BM, SK] },
  {
    displayName: 'Orders',
    iconName: 'shopping-cart',
    route: '/components/orders',
    bgcolor: 'primary',
    roles: [SA, A, BM, SK],
  },
  {
    displayName: 'Coupons',
    iconName: 'ticket',
    route: '/components/coupons',
    bgcolor: 'error',
    roles: [SA, A, BM, SK],
  },
  {
    displayName: 'Invoice Generator',
    iconName: 'file-text',
    route: '/components/invoices',
    bgcolor: 'warning',
    roles: [SA, A, BM, SK]
  },

  { navCap: 'Audit', roles: [SA, A] },
  {
    displayName: 'Audit Logs',
    iconName: 'clipboard-list',
    route: '/components/audit-logs',
    bgcolor: 'error',
    roles: [SA, A],
  },

  { navCap: 'Inventory & Stocks', roles: [SA, A, BM, SK] },
  {
    displayName: 'Stocks',
    iconName: 'box-seam',
    route: '/components/stocks',
    bgcolor: 'primary',
    roles: [SA, A, BM, SK],
  },
  {
    displayName: 'Branch Stocks',
    iconName: 'building-warehouse',
    route: '/components/branch-stocks',
    bgcolor: 'warning',
    roles: [SA, A, BM],
  },

  { navCap: 'Logistics & Finance', roles: [SA, A, BM, SK] },
  {
    displayName: 'Delivery Tracking',
    iconName: 'truck-delivery',
    route: '/components/delivery-tracking',
    bgcolor: 'primary',
    roles: [SA, A, BM, DB],
  },
  {
    displayName: 'Payments',
    iconName: 'credit-card',
    route: '/components/payments',
    bgcolor: 'success',
    roles: [SA, A, BM, SK],
  },

  { navCap: 'Workforce', roles: [SA, A, BM] },
  {
    displayName: 'Workforce Console',
    iconName: 'settings',
    route: '/components/workforce',
    bgcolor: 'primary',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Workforce Requests',
    iconName: 'file-check',
    route: '/components/workforce-requests',
    bgcolor: 'warning',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Attendance',
    iconName: 'calendar-stats',
    route: '/components/attendance',
    bgcolor: 'success',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Leave Management',
    iconName: 'calendar-off',
    route: '/components/leave',
    bgcolor: 'warning',
    roles: [SA, A, BM],
  },
  {
    displayName: 'Payroll',
    iconName: 'cash',
    route: '/components/payroll',
    bgcolor: 'primary',
    roles: [SA, A, BM],
  },

  { navCap: 'Operations & Workflows', roles: [SA, A, BM, SK, EM] },
  {
    displayName: 'Workflow Approvals',
    iconName: 'checkup-list',
    route: '/components/approvals',
    bgcolor: 'primary',
    roles: [SA, A, BM, SK, EM],
  },
  {
    displayName: 'Alerts',
    iconName: 'alert-circle',
    route: '/components/alerts',
    bgcolor: 'error',
  },
  {
    displayName: 'Notifications',
    iconName: 'bell',
    route: '/components/notifications',
    bgcolor: 'warning',
  },

  { navCap: 'Settings' },
  {
    displayName: 'Profile',
    iconName: 'user',
    route: '/components/profile',
    bgcolor: 'primary',
  },
  {
    displayName: 'Menu Bar',
    iconName: 'layout-navbar',
    route: '/components/menu-bar',
    bgcolor: 'warning',
    roles: [SA, A],
  },
  {
    displayName: 'Status',
    iconName: 'list-check',
    route: '/components/status',
    bgcolor: 'warning',
    roles: [SA, A],
  },
  {
    displayName: 'Change Password',
    iconName: 'lock',
    route: '/components/change-password',
    bgcolor: 'success',
  },
];
