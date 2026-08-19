import { Routes } from '@angular/router';
import { RoleGuard } from '../Securities/Guard/role.guard';

// PERF-1 FIX: All components are now lazy-loaded via loadComponent().
// Previously, 26+ components were imported at the top of this file and
// shipped in the same initial JS bundle — causing a massive startup load.
// Now each component is split into its own chunk and loaded on demand.

export const ComponentsRoutes: Routes = [

  // ─── POS & Devices ────────────────────────────────────────────────────────
  {
    path: 'pos-billing',
    loadComponent: () => import('./pos-billing/pos-billing').then(m => m.PosBillingComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'POS Billing Terminal',
      urls: [{ title: 'POS Billing', url: '/pos-billing' }]
    }
  },
  {
    path: 'devices',
    loadComponent: () => import('./devices/devices').then(m => m.DevicesComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Hardware & Devices Auto-Detect',
      urls: [{ title: 'Hardware & Devices', url: '/devices' }]
    }
  },

  // ─── Finance ──────────────────────────────────────────────────────────────
  {
    path: 'profit-loss',
    loadComponent: () => import('./profit-loss/profit-loss').then(m => m.ProfitLossComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Profit & Loss',
      urls: [{ title: 'Profit & Loss', url: '/profit-loss' }]
    }
  },

  // ─── Administration ───────────────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./app-admin/app-admin').then(m => m.AppAdmin),
    canActivate: [RoleGuard],
    data: {
      title: 'App Admin',
      urls: [{ title: 'App Admin', url: '/admin' }]
    }
  },
  {
    path: 'branch',
    loadComponent: () => import('./branch/branch').then(m => m.Branch),
    canActivate: [RoleGuard],
    data: {
      title: 'Branch',
      urls: [{ title: 'Branch', url: '/branch' }]
    }
  },
  {
    path: 'employees',
    loadComponent: () => import('./employees/employees').then(m => m.Employees),
    canActivate: [RoleGuard],
    data: {
      title: 'Employees',
      urls: [{ title: 'Employees', url: '/employees' }]
    }
  },
  {
    path: 'roles',
    loadComponent: () => import('./roles/roles').then(m => m.Roles),
    canActivate: [RoleGuard],
    data: {
      title: 'Roles',
      urls: [{ title: 'Roles', url: '/roles' }]
    }
  },
  {
    path: 'role-access',
    loadComponent: () => import('./role-access/role-access').then(m => m.RoleAccess),
    canActivate: [RoleGuard],
    data: {
      title: 'Role Access',
      urls: [{ title: 'Role Access', url: '/role-access' }]
    }
  },

  // ─── Universal / Settings ─────────────────────────────────────────────────
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile').then(m => m.Profile),
    canActivate: [RoleGuard],
    data: {
      title: 'Profile',
      urls: [{ title: 'Profile', url: '/profile' }]
    }
  },
  {
    path: 'change-password',
    loadComponent: () => import('./change-password/change-password').then(m => m.ChangePassword),
    canActivate: [RoleGuard],
    data: {
      title: 'Change Password',
      urls: [{ title: 'Change Password', url: '/change-password' }]
    }
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications').then(m => m.Notifications),
    canActivate: [RoleGuard],
    data: {
      title: 'Notifications',
      urls: [{ title: 'Notifications', url: '/notifications' }]
    }
  },
  {
    path: 'menubar',
    loadComponent: () => import('./menu-bar/menu-bar').then(m => m.MenuBar),
    canActivate: [RoleGuard],
    data: {
      title: 'Menu Bar',
      urls: [{ title: 'Menu Bar', url: '/menubar' }]
    }
  },
  {
    path: 'status',
    loadComponent: () => import('./status/status').then(m => m.Status),
    canActivate: [RoleGuard],
    data: {
      title: 'Status',
      urls: [{ title: 'Status', url: '/status' }]
    }
  },

  // ─── Catalog ──────────────────────────────────────────────────────────────
  {
    path: 'product-attribute',
    loadComponent: () => import('./product-attribute/product-attribute').then(m => m.ProductAttribute),
    canActivate: [RoleGuard],
    data: {
      title: 'Product Attribute',
      urls: [{ title: 'Product Attribute', url: '/product-attribute' }]
    }
  },
  {
    path: 'attribute-value',
    loadComponent: () => import('./attribute-value/attribute-value').then(m => m.AttributeValue),
    canActivate: [RoleGuard],
    data: {
      title: 'Attribute Value',
      urls: [{ title: 'Attribute Value', url: '/attribute-value' }]
    }
  },
  {
    path: 'category',
    loadComponent: () => import('./category/category').then(m => m.Category),
    canActivate: [RoleGuard],
    data: {
      title: 'Category',
      urls: [{ title: 'Category', url: '/category' }]
    }
  },
  {
    path: 'product',
    loadComponent: () => import('./product/product').then(m => m.Product),
    canActivate: [RoleGuard],
    data: {
      title: 'Product',
      urls: [{ title: 'Product', url: '/product' }]
    }
  },

  // ─── Sales & Billing ──────────────────────────────────────────────────────
  {
    path: 'orders',
    loadComponent: () => import('./orders/orders').then(m => m.Orders),
    canActivate: [RoleGuard],
    data: {
      title: 'Orders',
      urls: [{ title: 'Orders', url: '/orders' }]
    }
  },
  {
    path: 'coupons',
    loadComponent: () => import('./coupons/coupons').then(m => m.Coupons),
    canActivate: [RoleGuard],
    data: {
      title: 'Coupons Management',
      urls: [{ title: 'Coupons', url: '/coupons' }]
    }
  },
  {
    path: 'invoices',
    loadComponent: () => import('./invoices/invoices').then(m => m.Invoices),
    canActivate: [RoleGuard],
    data: {
      title: 'Invoice Generator',
      urls: [{ title: 'Invoice Generator', url: '/invoices' }]
    }
  },
  {
    path: 'manage-subscription-plans',
    loadComponent: () => import('./subscription-plans/subscription-plans').then(m => m.SubscriptionPlansComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Subscription Plans Management',
      urls: [{ title: 'Manage Plans', url: '/manage-subscription-plans' }]
    }
  },
  {
    path: 'billing-history',
    loadComponent: () => import('../pages/billing-history/billing-history').then(m => m.BillingHistoryComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Billing & Invoice History',
      urls: [{ title: 'Billing & Invoices', url: '/billing-history' }]
    }
  },
  {
    path: 'subscription-coupons',
    loadComponent: () => import('../pages/subscription-coupons/subscription-coupons').then(m => m.SubscriptionCouponsComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Subscription Coupons',
      urls: [{ title: 'Coupons', url: '/subscription-coupons' }]
    }
  },
  {
    path: 'checkout',
    loadComponent: () => import('./standard-checkout/standard-checkout').then(m => m.StandardCheckoutComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Standard Payment Checkout',
      urls: [{ title: 'Checkout', url: '/checkout' }]
    }
  },

  // ─── Audit & Compliance ───────────────────────────────────────────────────
  {
    path: 'audit-logs',
    loadComponent: () => import('./audit-logs/audit-logs').then(m => m.AuditLogs),
    canActivate: [RoleGuard],
    data: {
      title: 'Audit Logs',
      urls: [{ title: 'Audit Logs', url: '/audit-logs' }]
    }
  },

  // ─── Operations & Alerts ─────────────────────────────────────────────────
  {
    path: 'alerts',
    loadComponent: () => import('./alerts/alerts').then(m => m.Alerts),
    canActivate: [RoleGuard],
    data: {
      title: 'Alerts',
      urls: [{ title: 'Alerts', url: '/alerts' }]
    }
  },
  {
    path: 'approvals',
    loadComponent: () => import('./approvals/approvals').then(m => m.Approvals),
    canActivate: [RoleGuard],
    data: {
      title: 'Workflow Approvals',
      urls: [{ title: 'Workflow Approvals', url: '/approvals' }]
    }
  },

  // ─── Inventory & Stock ────────────────────────────────────────────────────
  {
    path: 'stocks',
    loadComponent: () => import('./stocks/stocks').then(m => m.Stocks),
    canActivate: [RoleGuard],
    data: {
      title: 'Stocks',
      urls: [{ title: 'Stocks', url: '/stocks' }]
    }
  },
  {
    path: 'branch-stocks',
    loadComponent: () => import('./branch-stocks/branch-stocks').then(m => m.BranchStocks),
    canActivate: [RoleGuard],
    data: {
      title: 'Branch Stocks',
      urls: [{ title: 'Branch Stocks', url: '/branch-stocks' }]
    }
  },

  // ─── Logistics ────────────────────────────────────────────────────────────
  {
    path: 'delivery-tracking',
    loadComponent: () => import('./delivery-tracking/delivery-tracking').then(m => m.DeliveryTracking),
    canActivate: [RoleGuard],
    data: {
      title: 'Delivery Tracking',
      urls: [{ title: 'Delivery Tracking', url: '/delivery-tracking' }]
    }
  },
  {
    path: 'payments',
    loadComponent: () => import('./payments/payments').then(m => m.Payments),
    canActivate: [RoleGuard],
    data: {
      title: 'Payments',
      urls: [{ title: 'Payments', url: '/payments' }]
    }
  },

  // ─── Workforce & HR ───────────────────────────────────────────────────────
  {
    path: 'attendance',
    loadComponent: () => import('./attendance/attendance').then(m => m.Attendance),
    canActivate: [RoleGuard],
    data: {
      title: 'Attendance',
      urls: [{ title: 'Attendance', url: '/attendance' }]
    }
  },
  {
    path: 'payroll',
    loadComponent: () => import('./payroll/payroll').then(m => m.Payroll),
    canActivate: [RoleGuard],
    data: {
      title: 'Payroll',
      urls: [{ title: 'Payroll', url: '/payroll' }]
    }
  },
  {
    path: 'leave',
    loadComponent: () => import('./leave/leave').then(m => m.Leave),
    canActivate: [RoleGuard],
    data: {
      title: 'Leave',
      urls: [{ title: 'Leave', url: '/leave' }]
    }
  },
  {
    path: 'workforce',
    loadComponent: () => import('./workforce/workforce').then(m => m.Workforce),
    canActivate: [RoleGuard],
    data: {
      title: 'Workforce Console',
      urls: [{ title: 'Workforce Console', url: '/workforce' }]
    }
  },
  {
    path: 'shifts',
    loadComponent: () => import('./workforce/workforce').then(m => m.Workforce),
    canActivate: [RoleGuard],
    data: {
      title: 'Shifts & Schedules',
      urls: [{ title: 'Shifts & Schedules', url: '/shifts' }]
    }
  },
  {
    path: 'break-policies',
    loadComponent: () => import('./workforce/workforce').then(m => m.Workforce),
    canActivate: [RoleGuard],
    data: {
      title: 'Break Deduction Rules',
      urls: [{ title: 'Break Deduction Rules', url: '/break-policies' }]
    }
  },
  {
    path: 'biometric',
    loadComponent: () => import('./workforce/workforce').then(m => m.Workforce),
    canActivate: [RoleGuard],
    data: {
      title: 'Biometric Sensors & Terminals',
      urls: [{ title: 'Biometric Sensors', url: '/biometric' }]
    }
  },
  {
    path: 'geofencing',
    loadComponent: () => import('./workforce/workforce').then(m => m.Workforce),
    canActivate: [RoleGuard],
    data: {
      title: 'GPS Geofencing Boundaries',
      urls: [{ title: 'GPS Geofencing', url: '/geofencing' }]
    }
  },
  {
    path: 'calendar',
    loadComponent: () => import('./calendar/calendar').then(m => m.CompanyCalendarComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Company Calendar',
      urls: [{ title: 'Company Calendar', url: '/calendar' }]
    }
  },
  {
    path: 'employee-documents',
    loadComponent: () => import('./employee-documents/employee-documents').then(m => m.EmployeeDocumentsComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'KYC Document Vault',
      urls: [{ title: 'KYC Document Vault', url: '/employee-documents' }]
    }
  },
  {
    path: 'workforce-requests',
    loadComponent: () => import('./workforce-requests/workforce-requests').then(m => m.WorkforceRequests),
    canActivate: [RoleGuard],
    data: {
      title: 'Workforce Requests',
      urls: [{ title: 'Workforce Requests', url: '/workforce-requests' }]
    }
  },

  // ─── CRM ──────────────────────────────────────────────────────────────────
  {
    path: 'crm-contacts',
    loadComponent: () => import('./crm-contacts/crm-contacts').then(m => m.CrmContacts),
    canActivate: [RoleGuard],
    data: {
      title: 'CRM Contacts',
      urls: [{ title: 'CRM Contacts', url: '/crm-contacts' }]
    }
  },

  // ─── Settings & Localization ──────────────────────────────────────────────
  {
    path: 'translations',
    loadComponent: () => import('./translation-management/translation-management').then(m => m.TranslationManagementComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Translation & Localization Console',
      urls: [{ title: 'Translation Console', url: '/translations' }]
    }
  },
  {
    path: 'settings/translations',
    loadComponent: () => import('./translation-management/translation-management').then(m => m.TranslationManagementComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Translation & Localization Console',
      urls: [{ title: 'Settings', url: '/settings' }, { title: 'Translations', url: '/settings/translations' }]
    }
  },

  // ─── Communication ────────────────────────────────────────────────────────
  {
    path: 'communication',
    loadComponent: () => import('./secure-chat/secure-chat').then(m => m.SecureChatComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Secure Communications Platform',
      urls: [{ title: 'Communication', url: '/communication' }]
    }
  },
  {
    path: 'communication/meetings',
    loadComponent: () => import('./team-meetings/team-meetings').then(m => m.TeamMeetingsComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Team Meetings & Screen Sharing',
      urls: [{ title: 'Team Meetings', url: '/communication/meetings' }]
    }
  },

  // ─── Mobility & Fleet ─────────────────────────────────────────────────────
  {
    path: 'ride-booking',
    loadComponent: () => import('./ride-booking/ride-booking.component').then(m => m.RideBookingComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Ride & Taxi Booking',
      urls: [{ title: 'Ride Booking', url: '/ride-booking' }]
    }
  },
  {
    path: 'car-rental',
    loadComponent: () => import('./car-rental/car-rental.component').then(m => m.CarRentalComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Car Rental & Subscriptions',
      urls: [{ title: 'Car Rental', url: '/car-rental' }]
    }
  },
  {
    path: 'parcel-logistics',
    loadComponent: () => import('./parcel-logistics/parcel-logistics.component').then(m => m.ParcelLogisticsComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Express Parcel & Freight Logistics',
      urls: [{ title: 'Parcel Logistics', url: '/parcel-logistics' }]
    }
  },
  {
    path: 'fleet-management',
    loadComponent: () => import('./fleet-management/fleet-management.component').then(m => m.FleetManagementComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Fleet Management',
      urls: [{ title: 'Fleet Management', url: '/fleet-management' }]
    }
  },
  {
    path: 'corporate-transport',
    loadComponent: () => import('./corporate-transport/corporate-transport.component').then(m => m.CorporateTransportComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Corporate & School Transit',
      urls: [{ title: 'Corporate Transport', url: '/corporate-transport' }]
    }
  },
  {
    path: 'live-tracking',
    loadComponent: () => import('./live-tracking/live-tracking.component').then(m => m.LiveTrackingComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Live GPS Telemetry',
      urls: [{ title: 'Live Tracking', url: '/live-tracking' }]
    }
  },
  {
    path: 'mobility-dashboard',
    loadComponent: () => import('./mobility-dashboard/mobility-dashboard.component').then(m => m.MobilityDashboardComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Mobility Executive Cockpit',
      urls: [{ title: 'Mobility Dashboard', url: '/mobility-dashboard' }]
    }
  },
  {
    path: 'vehicle-driver-verification',
    loadComponent: () => import('./vehicle-driver-verification/vehicle-driver-verification.component').then(m => m.VehicleDriverVerificationComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Vehicle & Driver Verification KYC',
      urls: [{ title: 'Verification', url: '/vehicle-driver-verification' }]
    }
  },
];
