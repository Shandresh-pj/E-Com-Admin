import { Routes } from '@angular/router';

import { AppIconsComponent } from './icons/icons.component';
import { AppSamplePageComponent } from './sample-page/sample-page.component';

export const ExtraRoutes: Routes = [

  {
    path:'icons',
    component:AppIconsComponent
  },

  {
    path:'sample-page',
    component:AppSamplePageComponent
  }

];