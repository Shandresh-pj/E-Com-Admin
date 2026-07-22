import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom,
  ErrorHandler,
} from '@angular/core';
import { provideNativeDateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';

import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';

import { routes } from './app.routes';

import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  TitleStrategy
} from '@angular/router';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TemplatePageTitleStrategy } from './services/title-strategy.service';

import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';

import { NgScrollbarModule } from 'ngx-scrollbar';

import { MaterialModule } from './material.module';

import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import { authInterceptor } from './Securities/Interceptor/auth.interceptor';
import { errorInterceptor } from './Securities/Interceptor/error.interceptor';
import { GlobalErrorHandler } from './services/global-error-handler';

export const appConfig: ApplicationConfig = {

  providers: [

    provideZoneChangeDetection({
      eventCoalescing: true
    }),

    provideRouter(
      routes,

      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),

      withComponentInputBinding()
    ),

    {
      provide: TitleStrategy,
      useClass: TemplatePageTitleStrategy
    },

    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },

    provideHttpClient(

      withInterceptors([
        authInterceptor,
        errorInterceptor,
      ]),

      withInterceptorsFromDi()

    ),

    provideAnimationsAsync(),

    importProvidersFrom(

      FormsModule,
      ReactiveFormsModule,
      MaterialModule,

      TablerIconsModule.pick(
        TablerIcons
      ),

      NgScrollbarModule

    ),

      // ErrorInterceptor is intentionally NOT registered here as an HTTP_INTERCEPTORS
      // provider. The functional authInterceptor (above) handles 401 with token
      // refresh and logout. Adding the class interceptor here caused double
      // error handling — the class interceptor fired first, did nothing for 401
      // (case 401: break), then re-threw the error which the functional interceptor
      // caught again, triggering two consecutive logout calls.

    provideNativeDateAdapter({
      parse: { dateInput: 'DD-MM-YYYY' },
      display: {
        dateInput: 'DD-MM-YYYY',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
      }
    }),
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ]
};