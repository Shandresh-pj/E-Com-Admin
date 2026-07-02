import { Routes } from '@angular/router';

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
import { Order } from './order/order';
import { ChangePassword } from './change-password/change-password';
import { AuditLogs } from './audit-logs/audit-logs';
import { RoleGuard } from '../Securities/Guard/role.guard';
import { UserType } from '../Securities/Models/role-access';

const SA = UserType.SUPER_ADMIN;
const A  = UserType.ADMIN;
const BM = UserType.BRANCH_MANAGER;
const SK = UserType.SHOPKEEPER;

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
      roles: [SA, A],
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
    path: 'order',
    component: Order,
    canActivate: [RoleGuard],
    data: {
      title: 'Order',
      roles: [SA, A, BM, SK],
      urls: [
        {
          title: 'Order',
          url: '/components/order'
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
  }

];
