import { Routes } from '@angular/router';
import { CrmContacts } from './crm-contacts/crm-contacts';
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
import { RoleGuard } from '../Securities/Guard/role.guard';
import { UserType } from '../Securities/Models/role-access';

const SA = UserType.SUPER_ADMIN;
const A = UserType.ADMIN;
const BM = UserType.BRANCH_MANAGER;
const SK = UserType.SHOPKEEPER;
const EM = UserType.EMPLOYEE;
const DB = UserType.DELIVERY_BOY;

export const ComponentsRoutes: Routes = [

  {
    path: 'admin',
    component: AppAdmin,
    canActivate: [RoleGuard],
    data: {
      title: 'App Admin',
      roles: [SA, A],
      urls: [
        { title: 'App Admin', url: '/components/admin' }
      ]
    }
  },

  {
    path: 'branch',
    component: Branch,
    canActivate: [RoleGuard],
    data: {
      title: 'Branch',
      roles: [SA, A],
      urls: [
        { title: 'Branch', url: '/components/branch' }
      ]
    }
  },

  {
    path: 'employees',
    component: Employees,
    canActivate: [RoleGuard],
    data: {
      title: 'Employees',
      roles: [SA, A, BM],
      urls: [
        { title: 'Employees', url: '/components/employees' }
      ]
    }
  },

  {
    path: 'roles',
    component: Roles,
    canActivate: [RoleGuard],
    data: {
      title: 'Roles',
      roles: [SA],
      urls: [
        { title: 'Roles', url: '/components/roles' }
      ]
    }
  },

  {
    path: 'role-access',
    component: RoleAccess,
    canActivate: [RoleGuard],
    data: {
      title: 'Role Access',
      roles: [SA],
      urls: [
        { title: 'Role Access', url: '/components/role-access' }
      ]
    }
  },

  {
    path: 'profile',
    component: Profile,
    data: {
      title: 'Profile',
      urls: [
        { title: 'Profile', url: '/components/profile' }
      ]
    }
  },

  {
    path: 'menubar',
    component: MenuBar,
    canActivate: [RoleGuard],
    data: {
      title: 'Menu Bar',
      roles: [SA],
      urls: [
        { title: 'Menu Bar', url: '/components/menubar' }
      ]
    }
  },

  {
    path: 'status',
    component: Status,
    canActivate: [RoleGuard],
    data: {
      title: 'Status',
      roles: [SA, A],
      urls: [
        { title: 'Status', url: '/components/status' }
      ]
    }
  },

  {
    path: 'product-attribute',
    component: ProductAttribute,
    canActivate: [RoleGuard],
    data: {
      title: 'Product Attribute',
      roles: [SA, A, BM],
      urls: [
        {
          title: 'Product Attribute',
          url: '/components/product-attribute'
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
      roles: [SA, A, BM],
      urls: [
        {
          title: 'Attribute Value',
          url: '/components/attribute-value'
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
      roles: [SA, A, BM],
      urls: [
        {
          title: 'Category',
          url: '/components/category'
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
      roles: [SA, A, BM, SK],
      urls: [
        {
          title: 'Product',
          url: '/components/product'
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
      roles: [SA, A, BM, SK],
      urls: [
        {
          title: 'Orders',
          url: '/components/orders'
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
          url: '/components/change-password'
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
      roles: [SA, A],
      urls: [
        { title: 'Audit Logs', url: '/components/audit-logs' }
      ]
    }
  },
  {
    path: 'alerts',
    component: Alerts,
    canActivate: [RoleGuard],
    data: {
      title: 'Alerts',
      roles: [SA, A, BM],
      urls: [{ title: 'Alerts', url: '/components/alerts' }]
    }
  },
  {
    path: 'attendance',
    component: Attendance,
    canActivate: [RoleGuard],
    data: {
      title: 'Attendance',
      roles: [SA, A, BM, SK, EM],
      urls: [{ title: 'Attendance', url: '/components/attendance' }]
    }
  },
  {
    path: 'branch-stocks',
    component: BranchStocks,
    canActivate: [RoleGuard],
    data: {
      title: 'Branch Stocks',
      roles: [SA, A, BM, SK],
      urls: [{ title: 'Branch Stocks', url: '/components/branch-stocks' }]
    }
  },
  {
    path: 'stocks',
    component: Stocks,
    canActivate: [RoleGuard],
    data: {
      title: 'Stocks',
      roles: [SA, A, BM, SK],
      urls: [{ title: 'Stocks', url: '/components/stocks' }]
    }
  },
  {
    path: 'payroll',
    component: Payroll,
    canActivate: [RoleGuard],
    data: {
      title: 'Payroll',
      roles: [SA, A, BM],
      urls: [{ title: 'Payroll', url: '/components/payroll' }]
    }
  },
  {
    path: 'leave',
    component: Leave,
    canActivate: [RoleGuard],
    data: {
      title: 'Leave',
      roles: [SA, A, BM, SK, EM],
      urls: [{ title: 'Leave', url: '/components/leave' }]
    }
  },
  {
    path: 'delivery-tracking',
    component: DeliveryTracking,
    canActivate: [RoleGuard],
    data: {
      title: 'Delivery Tracking',
      roles: [SA, A, BM, DB],
      urls: [{ title: 'Delivery Tracking', url: '/components/delivery-tracking' }]
    }
  },
  {
    path: 'payments',
    component: Payments,
    canActivate: [RoleGuard],
    data: {
      title: 'Payments',
      roles: [SA, A, BM, SK],
      urls: [{ title: 'Payments', url: '/components/payments' }]
    }
  },
  {
    path: 'notifications',
    component: Notifications,
    canActivate: [RoleGuard],
    data: {
      title: 'Notifications',
      urls: [{ title: 'Notifications', url: '/components/notifications' }]
    }
  },
  {
    path: 'workforce',
    component: Workforce,
    canActivate: [RoleGuard],
    data: {
      title: 'Workforce Console',
      roles: [SA, A, BM],
      urls: [{ title: 'Workforce Console', url: '/components/workforce' }]
    }
  },
  {
    path: 'invoices',
    component: Invoices,
    canActivate: [RoleGuard],
    data: {
      title: 'Invoice Generator',
      roles: [SA, A, BM, SK],
      urls: [{ title: 'Invoice Generator', url: '/components/invoices' }]
    }
  },
  {
    path: 'approvals',
    component: Approvals,
    canActivate: [RoleGuard],
    data: {
      title: 'Workflow Approvals',
      roles: [SA, A, BM, SK, EM],
      urls: [{ title: 'Workflow Approvals', url: '/components/approvals' }]
    }
  },
  {
    path: 'crm-contacts',
    component: CrmContacts,
    canActivate: [RoleGuard],
    data: {
      title: 'CRM Contacts',
      roles: [SA, A],
      urls: [{ title: 'CRM Contacts', url: '/components/crm-contacts' }]
    }
  }
];
