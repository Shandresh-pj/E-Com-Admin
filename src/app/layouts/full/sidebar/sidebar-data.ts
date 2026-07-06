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
  // {
  //   navCap: 'Admin',
  //   roles: [SA, A],
  // },
  // {
  //   displayName: 'App Admin',
  //   iconName: 'archive',
  //   route: '/components/admin',
  //   bgcolor: 'primary',
  //   roles: [SA, A],
  // },

  // {
  //   navCap: 'Branch',
  //   roles: [SA, A],
  // },
  // {
  //   displayName: 'App Branch',
  //   iconName: 'Badge',
  //   route: '/components/branch',
  //   bgcolor: 'warning',
  //   roles: [SA, A],
  // },
  // {
  //   navCap: 'Employees',
  //   roles: [SA, A, BM],
  // },
  // {
  //   displayName: 'App Employee',
  //   iconName: 'Badge',
  //   route: '/components/employees',
  //   bgcolor: 'success',
  //   roles: [SA, A, BM],
  // },
  // {
  //   navCap: 'Roles',
  //   roles: [SA],
  // },
  // {
  //   displayName: 'App Role Access',
  //   iconName: 'Badge',
  //   route: '/components/role-access',
  //   bgcolor: 'warning',
  //   roles: [SA],
  // },
  // {
  //   displayName: 'App Roles',
  //   iconName: 'Badge',
  //   route: '/components/roles',
  //   bgcolor: 'success',
  //   roles: [SA],
  // },

  // { navCap: 'Catalog', roles: [SA, A, BM, SK] },
  // {
  //   displayName: 'Product Attribute',
  //   iconName: 'tag',
  //   route: '/components/product-attribute',
  //   bgcolor: 'primary',
  //   roles: [SA, A, BM],
  // },
  // {
  //   displayName: 'Attribute Value',
  //   iconName: 'list-details',
  //   route: '/components/attribute-value',
  //   bgcolor: 'warning',
  //   roles: [SA, A, BM],
  // },
  // {
  //   displayName: 'Category',
  //   iconName: 'category',
  //   route: '/components/category',
  //   bgcolor: 'success',
  //   roles: [SA, A, BM],
  // },
  // {
  //   displayName: 'Product',
  //   iconName: 'box',
  //   route: '/components/product',
  //   bgcolor: 'error',
  //   roles: [SA, A, BM, SK],
  // },

  // { navCap: 'Sales', roles: [SA, A, BM, SK] },
  // {
  //   displayName: 'Order',
  //   iconName: 'shopping-cart',
  //   route: '/components/order',
  //   bgcolor: 'primary',
  //   roles: [SA, A, BM, SK],
  // },

  // { navCap: 'Audit', roles: [SA, A] },
  // {
  //   displayName: 'Audit Logs',
  //   iconName: 'clipboard-list',
  //   route: '/components/audit-logs',
  //   bgcolor: 'error',
  //   roles: [SA, A],
  // },

  // { navCap: 'Settings' },
  // {
  //   displayName: 'Status',
  //   iconName: 'list-check',
  //   route: '/components/status',
  //   bgcolor: 'warning',
  //   roles: [SA, A],
  // },
  // {
  //   navCap: 'Workforce',
  //   roles: [SA, A, BM],
  // },
  // {
  //   displayName: 'Workforce Console',
  //   iconName: 'settings',
  //   route: '/components/workforce',
  //   bgcolor: 'primary',
  //   roles: [SA, A, BM],
  // },
  // {
  //   displayName: 'Invoice Generator',
  //   iconName: 'file-text',
  //   route: '/components/invoices',
  //   bgcolor: 'warning',
  //   roles: [SA, A, BM, SK]
  // },
  {
    displayName: 'Change Password',
    iconName: 'lock',
    route: '/components/change-password',
    bgcolor: 'success',
  },
];
