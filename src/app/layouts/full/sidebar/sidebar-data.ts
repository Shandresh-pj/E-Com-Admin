import { NavItem } from './nav-item/nav-item';
import { UserType } from 'src/app/Securities/Models/role-access';

// ─── Role aliases ──────────────────────────────────────────────────────────
const SA  = UserType.SUPER_ADMIN;
const HA  = UserType.HOSPITAL_ADMIN;
const CA  = UserType.CLINIC_ADMIN;
const A   = UserType.ADMIN;
const DR  = UserType.DOCTOR;
const PH  = UserType.PHARMACIST;
const RC  = UserType.RECEPTIONIST;
const AC  = UserType.ACCOUNTANT;
const IM  = UserType.INVENTORY_MANAGER;
const CSH = UserType.CASHIER;
const AU  = UserType.AUDITOR;
// Legacy (kept for backward compat)
const BR  = UserType.BRANCH;
const BM  = UserType.BRANCH_MANAGER;
const SK  = UserType.SHOPKEEPER;
const EM  = UserType.EMPLOYEE;
const DB  = UserType.DELIVERY_BOY;

export const navItems: NavItem[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN
  // ═══════════════════════════════════════════════════════════════════════════
  { navCap: 'Main' },
  {
    displayName: 'Dashboard',
    iconName:    'layout-grid-add',
    route:       '/dashboard',
    bgcolor:     'primary',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTHCARE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    navCap: 'Healthcare',
    roles:  [SA, HA, CA, A, DR, PH, RC, IM, AC, AU],
  },
  {
    displayName: 'Doctors',
    iconName:    'stethoscope',
    route:       '/doctors',
    bgcolor:     'primary',
    roles:       [SA, HA, CA, A, RC, AU],
  },
  {
    displayName: 'Patients',
    iconName:    'heart-handshake',
    route:       '/patients',
    bgcolor:     'success',
    roles:       [SA, HA, CA, A, DR, RC, AU],
  },
  {
    displayName: 'Appointments',
    iconName:    'calendar-check',
    route:       '/appointments',
    bgcolor:     'info',
    roles:       [SA, HA, CA, A, DR, RC, AU],
  },
  {
    displayName: 'Consultations',
    iconName:    'clipboard-heart',
    route:       '/consultations',
    bgcolor:     'warning',
    roles:       [SA, HA, CA, A, DR, AU],
  },
  {
    displayName: 'Prescriptions',
    iconName:    'prescription',
    route:       '/prescriptions',
    bgcolor:     'secondary',
    roles:       [SA, HA, CA, A, DR, PH, AU],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHARMACY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    navCap: 'Pharmacy',
    roles:  [SA, HA, CA, A, PH, IM, CSH, AU],
  },
  {
    displayName: 'Pharmacy POS',
    iconName:    'receipt-2',
    route:       '/pharmacy-pos',
    bgcolor:     'success',
    roles:       [SA, HA, CA, A, PH, CSH],
  },
  {
    displayName: 'Medicine Master',
    iconName:    'pill',
    route:       '/medicines',
    bgcolor:     'primary',
    roles:       [SA, HA, CA, A, PH, IM, AU],
  },
  {
    displayName: 'Stock Approvals',
    iconName:    'checkup-list',
    route:       '/stock-approvals',
    bgcolor:     'warning',
    roles:       [SA, HA, CA, A, PH, IM, AU],
  },
  {
    displayName: 'Medicine Expiry',
    iconName:    'clock-exclamation',
    route:       '/medicine-expiry',
    bgcolor:     'error',
    roles:       [SA, HA, CA, A, PH, IM, AU],
  },
  {
    displayName: 'Inventory',
    iconName:    'building-warehouse',
    route:       '/stocks',
    bgcolor:     'info',
    roles:       [SA, HA, CA, A, PH, IM, AU],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING & FINANCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    navCap: 'Billing & Finance',
    roles:  [SA, HA, CA, A, AC, CSH, AU],
  },
  {
    displayName: 'Invoices',
    iconName:    'file-invoice',
    route:       '/invoices',
    bgcolor:     'primary',
    roles:       [SA, HA, CA, A, AC, CSH, PH, AU],
  },
  {
    displayName: 'Payments',
    iconName:    'credit-card',
    route:       '/payments',
    bgcolor:     'success',
    roles:       [SA, HA, CA, A, AC, CSH, AU],
  },
  {
    displayName: 'Profit & Loss',
    iconName:    'chart-pie',
    route:       '/profit-loss',
    bgcolor:     'secondary',
    roles:       [SA, HA, CA, A, AC, AU],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATIONS & ALERTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    navCap: 'Operations',
    roles:  [SA, HA, CA, A, PH, IM, RC, AU],
  },
  {
    displayName: 'Approvals',
    iconName:    'shield-check',
    route:       '/approvals',
    bgcolor:     'primary',
    roles:       [SA, HA, CA, A, IM, PH],
  },
  {
    displayName: 'Alerts',
    iconName:    'alert-triangle',
    route:       '/alerts',
    bgcolor:     'error',
    roles:       [SA, HA, CA, A, PH, IM, RC],
  },
  {
    displayName: 'Notifications',
    iconName:    'bell',
    route:       '/notifications',
    bgcolor:     'warning',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMINISTRATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    navCap: 'Administration',
    roles:  [SA, HA, CA, A, BR],
  },
  {
    displayName: 'Admin',
    iconName:    'shield',
    route:       '/admin',
    bgcolor:     'primary',
    roles:       [SA, HA, CA, A, BR],
  },
  {
    displayName: 'Branches',
    iconName:    'building-hospital',
    route:       '/branch',
    bgcolor:     'warning',
    roles:       [SA, HA, A, BR],
  },
  {
    displayName: 'Employees',
    iconName:    'users',
    route:       '/employees',
    bgcolor:     'success',
    roles:       [SA, HA, CA, A, BR, BM],
  },
  {
    displayName: 'CRM Contacts',
    iconName:    'address-book',
    route:       '/crm-contacts',
    bgcolor:     'info',
    roles:       [SA, HA, CA, A, BR],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS & SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    navCap: 'Access & Security',
    roles:  [SA, HA, CA, A, BR],
  },
  {
    displayName: 'Roles',
    iconName:    'key',
    route:       '/roles',
    bgcolor:     'success',
    roles:       [SA, HA, CA, A, BR],
  },
  {
    displayName: 'Role Access',
    iconName:    'lock-access',
    route:       '/role-access',
    bgcolor:     'warning',
    roles:       [SA, HA, CA, A, BR, BM],
  },
  {
    displayName: 'Audit Logs',
    iconName:    'clipboard-list',
    route:       '/audit-logs',
    bgcolor:     'error',
    roles:       [SA, HA, CA, A, BR, BM, AU],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS (visible to analytics-capable roles)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    navCap: 'Reports',
    roles:  [SA, HA, CA, A, AC, AU],
  },
  {
    displayName: 'Branch Inventory',
    iconName:    'building-warehouse',
    route:       '/branch-stocks',
    bgcolor:     'warning',
    roles:       [SA, HA, CA, A, BR, BM, IM],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  { navCap: 'System Settings' },
  {
    displayName: 'Profile',
    iconName:    'user',
    route:       '/profile',
    bgcolor:     'primary',
  },
  {
    displayName: 'Menu Management',
    iconName:    'layout-navbar',
    route:       '/menubar',
    bgcolor:     'warning',
    roles:       [SA, HA, CA, A, BR],
  },
  {
    displayName: 'Statuses',
    iconName:    'list-check',
    route:       '/status',
    bgcolor:     'warning',
    roles:       [SA, HA, CA, A, BR],
  },
  {
    displayName: 'Translations',
    iconName:    'language',
    route:       '/translations',
    bgcolor:     'primary',
    roles:       [SA, HA, CA, A, BR],
  },
  {
    displayName: 'Change Password',
    iconName:    'lock',
    route:       '/change-password',
    bgcolor:     'success',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY / GENERIC (Super Admin only — kept for backward compat)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    navCap: 'Legacy Modules',
    roles:  [SA],
  },
  {
    displayName: 'Mobility Hub',
    iconName:    'car',
    route:       '/mobility-dashboard',
    bgcolor:     'primary',
    roles:       [SA],
  },
  {
    displayName: 'Rides',
    iconName:    'steering-wheel',
    route:       '/ride-booking',
    bgcolor:     'success',
    roles:       [SA],
  },
  {
    displayName: 'Car Rentals',
    iconName:    'key',
    route:       '/car-rental',
    bgcolor:     'warning',
    roles:       [SA],
  },
  {
    displayName: 'Logistics',
    iconName:    'truck',
    route:       '/parcel-logistics',
    bgcolor:     'error',
    roles:       [SA],
  },
  {
    displayName: 'Fleet',
    iconName:    'radar',
    route:       '/fleet-management',
    bgcolor:     'info',
    roles:       [SA],
  },
  {
    displayName: 'Live Tracking',
    iconName:    'map-pin',
    route:       '/live-tracking',
    bgcolor:     'success',
    roles:       [SA],
  },
  {
    displayName: 'POS Terminal',
    iconName:    'receipt-2',
    route:       '/pos-billing',
    bgcolor:     'info',
    roles:       [SA],
  },
  {
    displayName: 'Products',
    iconName:    'box',
    route:       '/product',
    bgcolor:     'error',
    roles:       [SA],
  },
  {
    displayName: 'Orders',
    iconName:    'shopping-cart',
    route:       '/orders',
    bgcolor:     'primary',
    roles:       [SA],
  },
  {
    displayName: 'Attendance',
    iconName:    'calendar-stats',
    route:       '/attendance',
    bgcolor:     'success',
    roles:       [SA],
  },
  {
    displayName: 'Payroll',
    iconName:    'cash',
    route:       '/payroll',
    bgcolor:     'primary',
    roles:       [SA],
  },
  {
    displayName: 'Chat',
    iconName:    'messages',
    route:       '/communication',
    bgcolor:     'primary',
    roles:       [SA],
  },
];
