import { Routes } from '@angular/router';

import { AppSideLoginComponent }
from './side-login/side-login.component';

import { AppSideRegisterComponent }
from './side-register/side-register.component';

import { ForgetPassword }
from './forget-password/forget-password';

export const AuthenticationRoutes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: AppSideLoginComponent,
    title: 'Login'
  },

  {
    path: 'register',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'forgot-password',
    component: ForgetPassword,
    title: 'Forgot Password'
  },

  {
    path: 'verify-email',
    loadComponent: () => import('./verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
    title: 'Verify Email'
  },

  {
    path: 'setup-password',
    loadComponent: () => import('./setup-password/setup-password.component').then(m => m.SetupPasswordComponent),
    title: 'Setup Password'
  }

];