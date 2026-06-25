import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom,
} from '@angular/core';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';

import { routes } from './app.routes';

import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';

import { NgScrollbarModule } from 'ngx-scrollbar';

import { MaterialModule } from './material.module';

import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import { ErrorInterceptor } from './Securities/Interceptor/error.interceptor';
import { authInterceptor } from './Securities/Interceptor/auth.interceptor';

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

    provideHttpClient(

      withInterceptors([
        authInterceptor
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

    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }

  ]
};