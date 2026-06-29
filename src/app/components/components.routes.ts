import { Routes } from '@angular/router';
import { ForgetPassword } from './forget-password/forget-password';
import { AppAdmin } from './app-admin/app-admin';
import { Branch } from './branch/branch';
import { Employees } from './employees/employees';
import { Roles } from './roles/roles';
import { RoleAccess } from './role-access/role-access';
import { Profile } from './profile/profile';
import { MenuBar } from './menu-bar/menu-bar';

export const ComponentsRoutes: Routes = [
  {
    path: 'forget-password',
    component: ForgetPassword,
    data: {
        title: 'Forget Password',
        urls: [
          { title: 'Forget Password', url: '/components/forget-password' },
          
        ],
      },
  },
  {
    path: 'admin',
    component: AppAdmin,
    data: {
        title: 'App Admin',
        urls: [
          { title: 'App Admin', url: '/components/admin' },
          
        ],
      },
  },
  {
    path: 'branch',
    component: Branch,
    data: {
        title: 'Branch',
        urls: [
          { title: 'Branch', url: '/components/branch' },
        ],
      },
  },
  {
    path: 'employees',
    component: Employees,
    data: {
        title: 'Employees',
        urls: [
          { title: 'Employees', url: '/components/employees' },
        ],
      },
  },
  {
    path: 'roles',
    component: Roles,
    data: {
        title: 'Roles',
        urls: [
          { title: 'Roles', url: '/components/roles' },
        ],
      },
  },
  {
    path: 'role-access',
    component: RoleAccess,
    data: {
        title: 'Role Access',
        urls: [
          { title: 'Role Access', url: '/components/role-access' },
        ],
      },
  },
  {
    path: 'profile',
    component: Profile,
    data: {
        title: 'Profile',
        urls: [
          { title: 'Profile', url: '/components/profile' },
        ],
      },
  },
  {
    path: 'menubar',
    component: MenuBar,
    data: {
        title: 'MenuBar',
        urls: [
          { title: 'MenuBar', url: '/components/menubar' },
        ],
      },
  },
  {
    path: 'roles',
    component: MenuBar,
    data: {
        title: 'Roles',
        urls: [
          { title: 'Roles', url: '/components/roles' },
        ],
      },
  },
  {
    path: 'role-access',
    component: MenuBar,
    data: {
        title: 'Role Access',
        urls: [
          { title: 'Role Access', url: '/components/role-access' },
        ],
      },
  },
 
];
