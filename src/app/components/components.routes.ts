import { Routes } from '@angular/router';

import { ForgetPassword } from './forget-password/forget-password';
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

export const ComponentsRoutes: Routes = [

  {
    path: 'forget-password',
    component: ForgetPassword,
    data: {
      title: 'Forget Password',
      urls: [
        { title: 'Forget Password', url: '/components/forget-password' }
      ]
    }
  },

  {
    path: 'admin',
    component: AppAdmin,
    data: {
      title: 'App Admin',
      urls: [
        { title: 'App Admin', url: '/components/admin' }
      ]
    }
  },

  {
    path: 'branch',
    component: Branch,
    data: {
      title: 'Branch',
      urls: [
        { title: 'Branch', url: '/components/branch' }
      ]
    }
  },

  {
    path: 'employees',
    component: Employees,
    data: {
      title: 'Employees',
      urls: [
        { title: 'Employees', url: '/components/employees' }
      ]
    }
  },

  {
    path: 'roles',
    component: Roles,
    data: {
      title: 'Roles',
      urls: [
        { title: 'Roles', url: '/components/roles' }
      ]
    }
  },

  {
    path: 'role-access',
    component: RoleAccess,
    data: {
      title: 'Role Access',
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
    data: {
      title: 'Menu Bar',
      urls: [
        { title: 'Menu Bar', url: '/components/menubar' }
      ]
    }
  },

  {
    path: 'status',
    component: Status,
    data: {
      title: 'Status',
      urls: [
        { title: 'Status', url: '/components/status' }
      ]
    }
  },

  {
    path: 'product-attribute',
    component: ProductAttribute,
    data: {
      title: 'Product Attribute',
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
    data: {
      title: 'Attribute Value',
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
    data: {
      title: 'Category',
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
    data: {
      title: 'Product',
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
    data: {
      title: 'Order',
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
  }

];