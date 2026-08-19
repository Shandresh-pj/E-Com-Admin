import { Routes } from '@angular/router';

import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';

import { AuthGuard } from './Securities/Guard/auth.guard';
import { NonAuthGuard } from './Securities/Guard/nonauth.guard';
import { RoleGuard } from './Securities/Guard/role.guard';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';

import { HomeComponent } from './pages/home/home.component';
import { ContactComponent } from './pages/contact/contact.component';

export const routes: Routes = [

  // ─── Public landing pages (no auth required) ──────────────────────────────
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

  // ─── Public authentication pages (non-auth guard prevents re-login) ────────
  {
    path: 'authentication',
    component: BlankComponent,
    canMatch: [NonAuthGuard],
    loadChildren: () =>
      import('./pages/authentication/authentication.routes')
        .then(m => m.AuthenticationRoutes)
  },

  // ─── Protected application shell ──────────────────────────────────────────
  // AuthGuard: requires a valid access token (any authenticated user).
  // RoleGuard: applied per-route inside children for permission-level checks.
  {
    path: '',
    component: FullComponent,
    canMatch: [AuthGuard],

    children: [

      // Dashboard and nested pages (includes mobility dashboard sub-routes).
      // All child routes have RoleGuard applied inside pages.routes.ts.
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/pages.routes')
            .then(m => m.PagesRoutes)
      },

      // Root-level child routes — all feature modules.
      // RoleGuard is applied per-route inside components.routes.ts.
      {
        path: '',
        loadChildren: () =>
          import('./components/components.routes')
            .then(m => m.ComponentsRoutes)
      },

      // UI component demos (low-privilege pages, RoleGuard inside the module)
      {
        path: '',
        loadChildren: () =>
          import('./pages/ui-components/ui-components.routes')
            .then(m => m.UiComponentsRoutes)
      },

      // Extra pages (error pages etc.)
      {
        path: '',
        loadChildren: () =>
          import('./pages/extra/extra.routes')
            .then(m => m.ExtraRoutes)
      },

    ]
  },

  // ─── Unauthorized / Forbidden page ────────────────────────────────────────
  // Requires authentication to render (so the layout renders correctly),
  // but the page itself is in UNIVERSAL_PATHS so RoleGuard always allows it.
  {
    path: 'unauthorized',
    component: FullComponent,
    canMatch: [AuthGuard],
    children: [
      {
        path: '',
        component: UnauthorizedComponent,
        canActivate: [RoleGuard],
        data: { title: 'Unauthorized' }
      }
    ]
  },

  // ─── Catch-all redirect ───────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: 'authentication/login'
  }

];