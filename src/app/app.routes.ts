
import { Routes } from '@angular/router';

import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';

import { AuthGuard } from './Securities/Guard/auth.guard';
import { NonAuthGuard } from './Securities/Guard/nonauth.guard';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';

import { HomeComponent } from './pages/home/home.component';
import { ContactComponent } from './pages/contact/contact.component';

export const routes: Routes = [

  // default landing page
  {
    path: '',
    component: HomeComponent,
    title: 'Enterprise ERP & Multi-Vendor OS',
    pathMatch: 'full'
  },

  {
    path: 'home',
    component: HomeComponent,
    title: 'Enterprise ERP & Multi-Vendor OS'
  },

  {
    path: 'contact',
    component: ContactComponent,
    title: 'Enterprise Workspace Request & Zero-Trust Check'
  },

  // Public pages
  {
    path: 'authentication',
    component: BlankComponent,
    canMatch: [NonAuthGuard],

    loadChildren: () =>
      import('./pages/authentication/authentication.routes')
      .then(m => m.AuthenticationRoutes)
  },

  // Protected pages
  {
    path: '',
    component: FullComponent,
    canMatch: [AuthGuard],

    children: [

      {
        path:'dashboard',
        loadChildren:() =>
          import('./pages/pages.routes')
          .then(m => m.PagesRoutes)
      },

      {
        path:'ui-components',
        loadChildren:() =>
          import('./pages/ui-components/ui-components.routes')
          .then(m => m.UiComponentsRoutes)
      },

      {
        path:'extra',
        loadChildren:() =>
          import('./pages/extra/extra.routes')
          .then(m => m.ExtraRoutes)
      },

      {
        path:'components',
        loadChildren:() =>
          import('./components/components.routes')
          .then(m => m.ComponentsRoutes)
      },

      // Direct route shortcuts -> /components/...
      { path: 'crm-contacts', redirectTo: 'components/crm-contacts', pathMatch: 'full' },
      { path: 'admin', redirectTo: 'components/admin', pathMatch: 'full' },
      { path: 'branch', redirectTo: 'components/branch', pathMatch: 'full' },
      { path: 'employees', redirectTo: 'components/employees', pathMatch: 'full' },
      { path: 'roles', redirectTo: 'components/roles', pathMatch: 'full' },
      { path: 'role-access', redirectTo: 'components/role-access', pathMatch: 'full' },
      { path: 'product-attribute', redirectTo: 'components/product-attribute', pathMatch: 'full' },
      { path: 'attribute-value', redirectTo: 'components/attribute-value', pathMatch: 'full' },
      { path: 'category', redirectTo: 'components/category', pathMatch: 'full' },
      { path: 'product', redirectTo: 'components/product', pathMatch: 'full' },
      { path: 'orders', redirectTo: 'components/orders', pathMatch: 'full' },
      { path: 'invoices', redirectTo: 'components/invoices', pathMatch: 'full' },
      { path: 'audit-logs', redirectTo: 'components/audit-logs', pathMatch: 'full' },
      { path: 'workforce', redirectTo: 'components/workforce', pathMatch: 'full' },
      { path: 'attendance', redirectTo: 'components/attendance', pathMatch: 'full' },
      { path: 'leave', redirectTo: 'components/leave', pathMatch: 'full' },
      { path: 'status', redirectTo: 'components/status', pathMatch: 'full' },
      { path: 'change-password', redirectTo: 'components/change-password', pathMatch: 'full' },
      { path: 'stocks', redirectTo: 'components/stocks', pathMatch: 'full' },
      { path: 'branch-stocks', redirectTo: 'components/branch-stocks', pathMatch: 'full' },
      { path: 'delivery-tracking', redirectTo: 'components/delivery-tracking', pathMatch: 'full' },
      { path: 'payments', redirectTo: 'components/payments', pathMatch: 'full' },
      { path: 'payroll', redirectTo: 'components/payroll', pathMatch: 'full' },
      { path: 'approvals', redirectTo: 'components/approvals', pathMatch: 'full' },
      { path: 'alerts', redirectTo: 'components/alerts', pathMatch: 'full' },
      { path: 'notifications', redirectTo: 'components/notifications', pathMatch: 'full' },
      { path: 'profile', redirectTo: 'components/profile', pathMatch: 'full' },
      { path: 'menu-bar', redirectTo: 'components/menu-bar', pathMatch: 'full' }
    ]
  },

  {
    path: 'unauthorized',
    component: FullComponent,
    canMatch: [AuthGuard],
    children: [
      { path: '', component: UnauthorizedComponent }
    ]
  },

  {
    path:'**',
    redirectTo:'authentication/login'
  }

];