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
    title: 'Enterprise ERP & Mobility OS',
    pathMatch: 'full'
  },

  {
    path: 'home',
    component: HomeComponent,
    title: 'Enterprise ERP & Mobility OS'
  },

  {
    path: 'contact',
    component: ContactComponent,
    title: 'Workspace Access & Support'
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
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/pages.routes')
            .then(m => m.PagesRoutes)
      },

      {
        path: '',
        loadChildren: () =>
          import('./pages/pages.routes')
            .then(m => m.PagesRoutes)
      },

      // ─── Subscription & Billing ─────────────────────────────────────────────
      {
        path: 'subscription-plans',
        loadComponent: () => 
          import('./pages/subscription-plans/subscription-plans.component')
            .then(m => m.SubscriptionPlansComponent),
        title: 'Subscription Plans'
      },

      {
        path: 'billing-history',
        loadComponent: () => 
          import('./pages/billing-history/billing-history')
            .then(m => m.BillingHistoryComponent),
        title: 'Billing History'
      },

      {
        path: 'subscription-coupons',
        loadComponent: () => 
          import('./pages/subscription-coupons/subscription-coupons')
            .then(m => m.SubscriptionCouponsComponent),
        title: 'Subscription Coupons'
      },

      {
        path: 'checkout',
        loadComponent: () => 
          import('./components/standard-checkout/standard-checkout')
            .then(m => m.StandardCheckoutComponent),
        title: 'Checkout'
      },

      // ─── Lazy Feature Modules ───────────────────────────────────────────────
      {
        path: '',
        loadChildren: () =>
          import('./pages/ui-components/ui-components.routes')
            .then(m => m.UiComponentsRoutes)
      },

      {
        path: '',
        loadChildren: () =>
          import('./pages/extra/extra.routes')
            .then(m => m.ExtraRoutes)
      },

      // ─── All component routes (mobility, fleet, HR, etc.) ──────────────────
      {
        path: '',
        loadChildren: () =>
          import('./components/components.routes')
            .then(m => m.ComponentsRoutes)
      },

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
    path: '**',
    redirectTo: 'authentication/login'
  }

];