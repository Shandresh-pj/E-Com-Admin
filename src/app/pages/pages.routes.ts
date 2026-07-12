import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';

export const PagesRoutes: Routes = [

  {
    path:'',
    component: StarterComponent,
    title: 'Dashboard & Executive Analytics Cockpit',

    data:{

      title:'Dashboard & Executive Analytics Cockpit',

      urls:[
        {
          title:'Dashboard'
        },
        {
          title:'Starter Page'
        }
      ]

    }

  }

];