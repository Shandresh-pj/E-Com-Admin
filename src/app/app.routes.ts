
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
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/pages.routes')
            .then(m => m.PagesRoutes)
      },

      {
        path: 'subscription-plans',
        loadComponent: () => 
          import('./pages/subscription-plans/subscription-plans.component')
            .then(m => m.SubscriptionPlansComponent),
        title: 'Subscription Plans'
      },


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

      {
        path: '',
        loadChildren: () =>
          import('./components/components.routes')
            .then(m => m.ComponentsRoutes)
      },

      // Direct route shortcuts removed since routes are now natively flat.
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