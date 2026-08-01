import { Routes } from '@angular/router';
import { CrmContacts } from './crm-contacts/crm-contacts';
import { Coupons } from './coupons/coupons';
import { SubscriptionPlansComponent } from './subscription-plans/subscription-plans';
import { AppAdmin } from './app-admin/app-admin';
import { Branch } from './branch/branch';
import { Employees } from './employees/employees';
import { Roles } from './roles/roles';
import { RoleAccess } from './role-access/role-access';
import { Profile } from './profile/profile';
import { MenuBar } from './menu-bar/menu-bar';
import { Status } from './status/status';
import { ProductAttribute } from './product-attribute/product-attribute';
import { AttributeValue } from './attribute-value/attribute-value';
import { Category } from './category/category';
import { Product } from './product/product';
import { Orders } from './orders/orders';
import { ChangePassword } from './change-password/change-password';
import { AuditLogs } from './audit-logs/audit-logs';
import { Alerts } from './alerts/alerts';
import { Attendance } from './attendance/attendance';
import { BranchStocks } from './branch-stocks/branch-stocks';
import { Stocks } from './stocks/stocks';
import { Payroll } from './payroll/payroll';
import { Leave } from './leave/leave';
import { DeliveryTracking } from './delivery-tracking/delivery-tracking';
import { Payments } from './payments/payments';
import { Notifications } from './notifications/notifications';
import { Workforce } from './workforce/workforce';
import { Invoices } from './invoices/invoices';
import { Approvals } from './approvals/approvals';
import { EmployeeDocumentsComponent } from './employee-documents/employee-documents';
import { RoleGuard } from '../Securities/Guard/role.guard';
import { UserType } from '../Securities/Models/role-access';

const SA = UserType.SUPER_ADMIN;
const A = UserType.ADMIN;
const BR = UserType.BRANCH;
const BM = UserType.BRANCH_MANAGER;
const SK = UserType.SHOPKEEPER;
const EM = UserType.EMPLOYEE;
const DB = UserType.DELIVERY_BOY;

export const ComponentsRoutes: Routes = [
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
  {
    path: 'profit-loss',
    loadComponent: () => import('./profit-loss/profit-loss').then(m => m.ProfitLossComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Profit & Loss',
      urls: [{ title: 'Profit & Loss', url: '/profit-loss' }]
    }
  },
  {
    path: 'admin',
    component: AppAdmin,
    canActivate: [RoleGuard],
    data: {
      title: 'App Admin',
      urls: [
        { title: 'App Admin', url: '/admin' }
      ]
    }
  },

  {
    path: 'branch',
    component: Branch,
    canActivate: [RoleGuard],
    data: {
      title: 'Branch',
      urls: [
        { title: 'Branch', url: '/branch' }
      ]
    }
  },

  {
    path: 'employees',
    component: Employees,
    canActivate: [RoleGuard],
    data: {
      title: 'Employees',
      urls: [
        { title: 'Employees', url: '/employees' }
      ]
    }
  },

  {
    path: 'roles',
    component: Roles,
    canActivate: [RoleGuard],
    data: {
      title: 'Roles',
      urls: [
        { title: 'Roles', url: '/roles' }
      ]
    }
  },

  {
    path: 'role-access',
    component: RoleAccess,
    canActivate: [RoleGuard],
    data: {
      title: 'Role Access',
      urls: [
        { title: 'Role Access', url: '/role-access' }
      ]
    }
  },

  {
    path: 'profile',
    component: Profile,
    data: {
      title: 'Profile',
      urls: [
        { title: 'Profile', url: '/profile' }
      ]
    }
  },

  {
    path: 'menubar',
    component: MenuBar,
    canActivate: [RoleGuard],
    data: {
      title: 'Menu Bar',
      urls: [
        { title: 'Menu Bar', url: '/menubar' }
      ]
    }
  },

  {
    path: 'status',
    component: Status,
    canActivate: [RoleGuard],
    data: {
      title: 'Status',
      urls: [
        { title: 'Status', url: '/status' }
      ]
    }
  },

  {
    path: 'product-attribute',
    component: ProductAttribute,
    canActivate: [RoleGuard],
    data: {
      title: 'Product Attribute',
      urls: [
        {
          title: 'Product Attribute',
          url: '/product-attribute'
        }
      ]
    }
  },

  {
    path: 'attribute-value',
    component: AttributeValue,
    canActivate: [RoleGuard],
    data: {
      title: 'Attribute Value',
      urls: [
        {
          title: 'Attribute Value',
          url: '/attribute-value'
        }
      ]
    }
  },

  {
    path: 'category',
    component: Category,
    canActivate: [RoleGuard],
    data: {
      title: 'Category',
      urls: [
        {
          title: 'Category',
          url: '/category'
        }
      ]
    }
  },

  {
    path: 'product',
    component: Product,
    canActivate: [RoleGuard],
    data: {
      title: 'Product',
      urls: [
        {
          title: 'Product',
          url: '/product'
        }
      ]
    }
  },

  {
    path: 'orders',
    component: Orders,
    canActivate: [RoleGuard],
    data: {
      title: 'Orders',
      urls: [
        {
          title: 'Orders',
          url: '/orders'
        }
      ]
    }
  },

  {
    path: 'change-password',
    component: ChangePassword,
    data: {
      title: 'Change Password',
      urls: [
        {
          title: 'Change Password',
          url: '/change-password'
        }
      ]
    }
  },

  {
    path: 'audit-logs',
    component: AuditLogs,
    canActivate: [RoleGuard],
    data: {
      title: 'Audit Logs',
      urls: [
        { title: 'Audit Logs', url: '/audit-logs' }
      ]
    }
  },

  {
    path: 'alerts',
    component: Alerts,
    canActivate: [RoleGuard],
    data: {
      title: 'Alerts',
      urls: [{ title: 'Alerts', url: '/alerts' }]
    }
  },
  {
    path: 'attendance',
    component: Attendance,
    canActivate: [RoleGuard],
    data: {
      title: 'Attendance',
      urls: [{ title: 'Attendance', url: '/attendance' }]
    }
  },
  {
    path: 'branch-stocks',
    component: BranchStocks,
    canActivate: [RoleGuard],
    data: {
      title: 'Branch Stocks',
      urls: [{ title: 'Branch Stocks', url: '/branch-stocks' }]
    }
  },
  {
    path: 'stocks',
    component: Stocks,
    canActivate: [RoleGuard],
    data: {
      title: 'Stocks',
      urls: [{ title: 'Stocks', url: '/stocks' }]
    }
  },
  {
    path: 'payroll',
    component: Payroll,
    canActivate: [RoleGuard],
    data: {
      title: 'Payroll',
      urls: [{ title: 'Payroll', url: '/payroll' }]
    }
  },
  {
    path: 'leave',
    component: Leave,
    canActivate: [RoleGuard],
    data: {
      title: 'Leave',
      urls: [{ title: 'Leave', url: '/leave' }]
    }
  },
  {
    path: 'delivery-tracking',
    component: DeliveryTracking,
    canActivate: [RoleGuard],
    data: {
      title: 'Delivery Tracking',
      urls: [{ title: 'Delivery Tracking', url: '/delivery-tracking' }]
    }
  },
  {
    path: 'payments',
    component: Payments,
    canActivate: [RoleGuard],
    data: {
      title: 'Payments',
      urls: [{ title: 'Payments', url: '/payments' }]
    }
  },
  {
    path: 'notifications',
    component: Notifications,
    data: {
      title: 'Notifications',
      urls: [{ title: 'Notifications', url: '/notifications' }]
    }
  },
  {
    path: 'workforce',
    component: Workforce,
    canActivate: [RoleGuard],
    data: {
      title: 'Workforce Console',
      urls: [{ title: 'Workforce Console', url: '/workforce' }]
    }
  },
  {
    path: 'shifts',
    component: Workforce,
    canActivate: [RoleGuard],
    data: {
      title: 'Shifts & Schedules',
      urls: [{ title: 'Shifts & Schedules', url: '/shifts' }]
    }
  },
  {
    path: 'break-policies',
    component: Workforce,
    canActivate: [RoleGuard],
    data: {
      title: 'Break Deduction Rules',
      urls: [{ title: 'Break Deduction Rules', url: '/break-policies' }]
    }
  },
  {
    path: 'biometric',
    component: Workforce,
    canActivate: [RoleGuard],
    data: {
      title: 'Biometric Sensors & Terminals',
      urls: [{ title: 'Biometric Sensors', url: '/biometric' }]
    }
  },
  {
    path: 'geofencing',
    component: Workforce,
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
    component: EmployeeDocumentsComponent,
    canActivate: [RoleGuard],
    data: {
      title: 'KYC Document Vault',
      urls: [{ title: 'KYC Document Vault', url: '/employee-documents' }]
    }
  },
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
  {
    path: 'workforce-requests',
    loadComponent: () => import('./workforce-requests/workforce-requests').then(m => m.WorkforceRequests),
    canActivate: [RoleGuard],
    data: {
      title: 'Workforce Requests',
      urls: [{ title: 'Workforce Requests', url: '/workforce-requests' }]
    }
  },
  {
    path: 'invoices',
    component: Invoices,
    canActivate: [RoleGuard],
    data: {
      title: 'Invoice Generator',
      urls: [{ title: 'Invoice Generator', url: '/invoices' }]
    }
  },
  {
    path: 'approvals',
    component: Approvals,
    canActivate: [RoleGuard],
    data: {
      title: 'Workflow Approvals',
      urls: [{ title: 'Workflow Approvals', url: '/approvals' }]
    }
  },
  {
    path: 'crm-contacts',
    component: CrmContacts,
    canActivate: [RoleGuard],
    data: {
      title: 'CRM Contacts',
      urls: [{ title: 'CRM Contacts', url: '/crm-contacts' }]
    }
  },
  {
    path: 'coupons',
    component: Coupons,
    canActivate: [RoleGuard],
    data: {
      title: 'Coupons Management',
      urls: [{ title: 'Coupons', url: '/coupons' }]
    }
  },
  {
    path: 'manage-subscription-plans',
    component: SubscriptionPlansComponent,
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

  // ─── Delivery Tracking (Logistics & Finance section) ───────────────────────
  {
    path: 'delivery-tracking',
    loadComponent: () => import('./delivery-tracking/delivery-tracking').then(m => m.DeliveryTracking),
    canActivate: [RoleGuard],
    data: {
      title: 'Delivery Tracking',
      urls: [{ title: 'Delivery Tracking', url: '/delivery-tracking' }]
    }
  },

  // ─── Subscription Management ────────────────────────────────────────────────
  {
    path: 'manage-subscription-plans',
    loadComponent: () => import('./subscription-plans/subscription-plans').then(m => m.SubscriptionPlansComponent),
    canActivate: [RoleGuard],
    data: {
      title: 'Manage Subscription Plans',
      urls: [{ title: 'Subscription Plans', url: '/manage-subscription-plans' }]
    }
  }
];

