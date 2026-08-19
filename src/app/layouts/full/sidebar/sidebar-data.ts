import { NavItem } from './nav-item/nav-item';
import { UserType } from 'src/app/Securities/Models/role-access';

const SA = UserType.SUPER_ADMIN;
const A  = UserType.ADMIN;
const BR = UserType.BRANCH;
const BM = UserType.BRANCH_MANAGER;
const SK = UserType.SHOPKEEPER;
const DB = UserType.DELIVERY_BOY;
const EM = UserType.EMPLOYEE;

export const navItems: NavItem[] = [
  {
    navCap: 'Main',
  },
  {
    displayName: 'Dashboard',
    iconName: 'layout-grid-add',
    route: '/dashboard',
    bgcolor: 'primary',
  },
  {
    navCap: 'Mobility & Fleet',
  },
  {
    displayName: 'Mobility Cockpit',
    iconName: 'car',
    route: '/mobility-dashboard',
    bgcolor: 'primary',
  },
  {
    displayName: 'Ride Booking',
    iconName: 'steering-wheel',
    route: '/ride-booking',
    bgcolor: 'success',
  },
  {
    displayName: 'Car Rentals',
    iconName: 'key',
    route: '/car-rental',
    bgcolor: 'warning',
  },
  {
    displayName: 'Parcel Logistics',
    iconName: 'truck',
    route: '/parcel-logistics',
    bgcolor: 'error',
  },
  {
    displayName: 'Fleet Management',
    iconName: 'radar',
    route: '/fleet-management',
    bgcolor: 'info',
  },
  {
    displayName: 'Corporate Transit',
    iconName: 'building',
    route: '/corporate-transport',
    bgcolor: 'primary',
  },
  {
    displayName: 'Live Tracking',
    iconName: 'map-pin',
    route: '/live-tracking',
    bgcolor: 'success',
  },
  {
    displayName: 'KYC Verification',
    iconName: 'user-check',
    route: '/vehicle-driver-verification',
    bgcolor: 'warning',
  },
  {
    navCap: 'Administration',
    roles: [SA, A, BR],

  },
  {
    displayName: 'Admin Console',
    iconName: 'shield',
    route: '/admin',
    bgcolor: 'primary',
    roles: [SA, A, BR],
  },
  {
    displayName: 'CRM Contacts',
    iconName: 'users',
    route: '/crm-contacts',
    bgcolor: 'primary',
    roles: [SA, A, BR],
  },
  {
    navCap: 'Branch Control',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Branches',
    iconName: 'building-store',
    route: '/branch',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM],
  },
  {
    navCap: 'Employees',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Employee Roster',
    iconName: 'user-check',
    route: '/employees',
    bgcolor: 'success',
    roles: [SA, A, BR, BM],
  },
  {
    navCap: 'Access & Security',
    roles: [SA, A, BR],
  },
  {
    displayName: 'Role Permissions',
    iconName: 'lock-access',
    route: '/role-access',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'System Roles',
    iconName: 'key',
    route: '/roles',
    bgcolor: 'success',
    roles: [SA, A, BR],
  },

  { navCap: 'Catalog & Products', roles: [SA, A, BR, BM, SK] },
  {
    displayName: 'Product Attributes',
    iconName: 'tag',
    route: '/product-attribute',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM, SK],
  },
  {
    displayName: 'Attribute Values',
    iconName: 'list-details',
    route: '/attribute-value',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM, SK],
  },
  {
    displayName: 'Categories',
    iconName: 'category',
    route: '/category',
    bgcolor: 'success',
    roles: [SA, A, BR, BM, SK],
  },
  {
    displayName: 'Products',
    iconName: 'box',
    route: '/product',
    bgcolor: 'error',
    roles: [SA, A, BR, BM, SK, EM],
  },

  { navCap: 'Sales & Billing', roles: [SA, A, BR, BM, SK] },
  {
    displayName: 'POS Terminal',
    iconName: 'receipt-2',
    route: '/pos-billing',
    bgcolor: 'success',
    roles: [SA, A, BR, BM, SK],
  },
  {
    displayName: 'Orders',
    iconName: 'shopping-cart',
    route: '/orders',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM, SK, EM, DB],
  },
  {
    displayName: 'Coupons',
    iconName: 'ticket',
    route: '/coupons',
    bgcolor: 'error',
    roles: [SA, A, BR, BM, SK],
  },
  {
    displayName: 'Invoices',
    iconName: 'file-text',
    route: '/invoices',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM, SK]
  },
  {
    displayName: 'Subscription Plans',
    iconName: 'diamond',
    route: '/manage-subscription-plans',
    bgcolor: 'secondary',
    roles: [SA, A, BR]
  },
  {
    displayName: 'Plan Upgrade',
    iconName: 'premium-rights',
    route: '/subscription-plans',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM]
  },
  {
    displayName: 'Billing History',
    iconName: 'receipt',
    route: '/billing-history',
    bgcolor: 'success',
    roles: [SA, A, BR, BM, SK]
  },
  {
    displayName: 'Subscription Coupons',
    iconName: 'ticket',
    route: '/subscription-coupons',
    bgcolor: 'warning',
    roles: [SA, A, BR]
  },
  {
    displayName: 'Checkout',
    iconName: 'credit-card',
    route: '/checkout',
    bgcolor: 'info',
    roles: [SA, A, BR, BM, SK, EM, DB]
  },

  { navCap: 'Audit & Compliance', roles: [SA, A, BR, BM] },
  {
    displayName: 'Audit Logs',
    iconName: 'clipboard-list',
    route: '/audit-logs',
    bgcolor: 'error',
    roles: [SA, A, BR, BM],
  },

  { navCap: 'Inventory & Stock', roles: [SA, A, BR, BM, SK] },
  {
    displayName: 'Stock Inventory',
    iconName: 'box-seam',
    route: '/stocks',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM, SK],
  },
  {
    displayName: 'Branch Stocks',
    iconName: 'building-warehouse',
    route: '/branch-stocks',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM],
  },

  { navCap: 'Logistics & Finance', roles: [SA, A, BR, BM, SK] },
  {
    displayName: 'Hardware Devices',
    iconName: 'devices',
    route: '/devices',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Profit & Loss',
    iconName: 'chart-pie',
    route: '/profit-loss',
    bgcolor: 'secondary',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Delivery Tracking',
    iconName: 'truck-delivery',
    route: '/delivery-tracking',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM, DB],
  },
  {
    displayName: 'Payment Records',
    iconName: 'credit-card',
    route: '/payments',
    bgcolor: 'success',
    roles: [SA, A, BR, BM, SK],
  },

  { navCap: 'Workforce & HR', roles: [SA, A, BR, BM, SK, DB, EM] },
  {
    displayName: 'Workforce Hub',
    iconName: 'settings',
    route: '/workforce',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Shifts & Rosters',
    iconName: 'clock',
    route: '/shifts',
    bgcolor: 'info',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Break Rules',
    iconName: 'cup',
    route: '/break-policies',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Biometrics',
    iconName: 'fingerprint',
    route: '/biometric',
    bgcolor: 'success',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Geofencing',
    iconName: 'map-pin',
    route: '/geofencing',
    bgcolor: 'error',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Workforce Requests',
    iconName: 'file-check',
    route: '/workforce-requests',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM],
  },
  {
    displayName: 'Attendance',
    iconName: 'calendar-stats',
    route: '/attendance',
    bgcolor: 'success',
    roles: [SA, A, BR, BM, SK, DB, EM],
  },
  {
    displayName: 'Leave Management',
    iconName: 'calendar-off',
    route: '/leave',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM, SK, DB, EM],
  },
  {
    displayName: 'Calendar',
    iconName: 'calendar-event',
    route: '/calendar',
    bgcolor: 'info',
    roles: [SA, A, BR, BM, EM],
  },
  {
    displayName: 'Employee Documents',
    iconName: 'file-check',
    route: '/employee-documents',
    bgcolor: 'warning',
    roles: [SA, A, BR, BM, EM],
  },
  {
    displayName: 'Payroll',
    iconName: 'cash',
    route: '/payroll',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM, EM],
  },

  { navCap: 'Operations & Alerts', roles: [SA, A, BR, BM, SK, EM] },
  {
    displayName: 'Approvals',
    iconName: 'checkup-list',
    route: '/approvals',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM, SK, EM],
  },
  {
    displayName: 'System Alerts',
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

  { navCap: 'Communication', roles: [SA, A, BR, BM, SK, DB, EM] },
  {
    displayName: 'Secure Chat',
    iconName: 'messages',
    route: '/communication',
    bgcolor: 'primary',
    roles: [SA, A, BR, BM, SK, DB, EM],
  },
  {
    displayName: 'Team Meetings',
    iconName: 'video',
    route: '/communication/meetings',
    bgcolor: 'success',
    roles: [SA, A, BR, BM, SK, DB, EM],
  },

  { navCap: 'System Settings' },
  {
    displayName: 'Profile',
    iconName: 'user',
    route: '/profile',
    bgcolor: 'primary',
  },
  {
    displayName: 'Translations',
    iconName: 'language',
    route: '/translations',
    bgcolor: 'primary',
    roles: [SA, A, BR],
  },
  {
    displayName: 'Menu Config',
    iconName: 'layout-navbar',
    route: '/menubar',
    bgcolor: 'warning',
    roles: [SA, A, BR],
  },
  {
    displayName: 'System Status',
    iconName: 'list-check',
    route: '/status',
    bgcolor: 'warning',
    roles: [SA, A, BR],
  },
  {
    displayName: 'Change Password',
    iconName: 'lock',
    route: '/change-password',
    bgcolor: 'success',
  },
];
