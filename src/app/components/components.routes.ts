import { Routes } from '@angular/router';
import { ForgetPassword } from './forget-password/forget-password';
import { AppAdmin } from './app-admin/app-admin';
import { Branch } from './branch/branch';

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
];
