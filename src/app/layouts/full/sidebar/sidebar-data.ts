import { NavItem } from './nav-item/nav-item';

export const navItems: NavItem[] = [
  {
    navCap: 'Home',
  },
  {
    displayName: 'Dashboard',
    iconName: 'layout-grid-add',
    route: '/dashboard',
    bgcolor: 'primary',
  },
  {
    navCap: 'Admin',
  },
  {
    displayName: 'App Admin',
    iconName: 'archive',
    route: '/components/admin',
    bgcolor: 'primary',
  },

 {
    navCap: 'Branch',
  },
  {
    displayName: 'App Branch',
    iconName: 'Badge',
    route: '/components/branch',
    bgcolor: 'warning',
  },
  {
    navCap: 'Employees',
  },
  {
    displayName: 'App Employee',
    iconName: 'Badge',
    route: '/components/employees',
    bgcolor: 'success',
  },
  {
    navCap: 'Roles',
  },
  {
    displayName: 'App Role Access',
    iconName: 'Badge',
    route: '/components/role-access',
    bgcolor: 'warning',
  },
  {
    displayName: 'App Roles',
    iconName: 'Badge',
    route: '/components/roles',
    bgcolor: 'success',
  },
 

  { navCap: 'Forgot Password'},
  {
    displayName: 'Forgot Password',
    iconName: 'rotate',
    route: '/components/forget-password',
    bgcolor: 'success',
  },

//   {
//     navCap: 'Apps',
//   },
//   {
//     displayName: 'Invoice',
//     iconName: 'file-invoice',
//     bgcolor: 'primary',
//     chip: true,
//     route: '',
//     children: [
//       // {
//       //   displayName: 'List',
//       //   iconName: 'point',
//       //   bgcolor: 'tranparent',
//       //   external: true,
//       //   chip: true,
//       //   chipClass: 'bg-light-primary text-primary',
//       //   chipContent: 'PRO',
//       //   route: 'https://spike-angular-pro-main.netlify.app/apps/invoice',
//       // },
//     ],
//   },
  
//   {
//     displayName: 'Blog',
//     iconName: 'chart-donut-3',
//     bgcolor: 'secondary',
    
//     route: 'apps/blog',
//     children: [
//       // {
//       //   displayName: 'Post',
//       //   iconName: 'point',
//       //   bgcolor: 'tranparent',
//       //   external: true,
//       //   chip: true,
//       //   chipClass: 'bg-light-primary text-primary',
//       //   chipContent: 'PRO',
//       //   route: 'https://spike-angular-pro-main.netlify.app/apps/blog/post',
//       // },
      
//     ],
//   },

//   {
//     navCap: 'Ui Components',
//   },
//   {
//     displayName: 'Badge',
//     iconName: 'archive',
//     route: '/ui-components/badge',
//     bgcolor: 'warning',
//   },
//   {
//     displayName: 'Chips',
//     iconName: 'info-circle',
//     route: '/ui-components/chips',
//     bgcolor: 'success',
//   },
//   {
//     displayName: 'Lists',
//     iconName: 'list-details',
//     route: '/ui-components/lists',
//     bgcolor: 'error',
//   },
//   {
//     displayName: 'Menu',
//     iconName: 'file-text',
//     route: '/ui-components/menu',
//     bgcolor: 'primary',
//   },
//   {
//     displayName: 'Tooltips',
//     iconName: 'file-text-ai',
//     route: '/ui-components/tooltips',
//     bgcolor: 'secondary',
//   },
//   {
//     displayName: 'Forms',
//     iconName: 'clipboard-text',
//     route: '/ui-components/forms',
//     bgcolor: 'warning',
//   },
//   {
//     displayName: 'Tables',
//     iconName: 'table',
//     route: '/ui-components/tables',
//     bgcolor: 'success',
//   },

//   {
//     navCap: 'Pages',
//   },
//   // {
//   //   displayName: 'Roll Base Access',
//   //   iconName: 'lock-access',
//   //   route: 'https://spike-angular-pro-main.netlify.app/apps/permission',
//   //   bgcolor: 'warning',
//   //   external: true,
//   //   chip: true,
//   //   chipClass: 'bg-light-primary text-primary',
//   //   chipContent: 'PRO',
//   // },
//   {
//     displayName: 'Widgets',
//     iconName: 'layout',
//     route: 'widgets',
//     bgcolor: 'success',
    
//     children: [
//       // {
//       //   displayName: 'Cards',
//       //   iconName: 'point',
//       //   route: 'https://spike-angular-pro-main.netlify.app/widgets/cards',
//       //   bgcolor: 'tranparent',
//       //   external: true,
//       //   chip: true,
//       //   chipClass: 'bg-light-primary text-primary',
//       //   chipContent: 'PRO',
//       // },
//     ],
//   },
//   {
//     navCap: 'Extra',
//   },
//   {
//     displayName: 'Icons',
//     iconName: 'mood-smile',
//     route: '/extra/icons',
//     bgcolor: 'error',
//   },
//   {
//     displayName: 'Sample Page',
//     iconName: 'brand-dribbble',
//     route: '/extra/sample-page',
//     bgcolor: 'primary',
//   },

 
//   {
//     navCap: 'Forms',
//   },
//   {
//     displayName: 'Elements',
//     iconName: 'apps',
//     bgcolor: 'secondary',
    
//     route: 'forms/forms-elements',
//     children: [
//       // {
//       //   displayName: 'Autocomplete',
//       //   iconName: 'point',
//       //   route:
//       //     'https://spike-angular-pro-main.netlify.app/forms/forms-elements/autocomplete',
//       //   bgcolor: 'tranparent',
//       //     external: true,
//       //   chip: true,
//       //   chipClass: 'bg-light-primary text-primary',
//       //   chipContent: 'PRO',
//       // },
//     ],
//   },
//   // {
//   //   displayName: 'Form Layouts',
//   //   iconName: 'file-description',
//   //   route: 'https://spike-angular-pro-main.netlify.app/forms/form-layouts',
//   //   bgcolor: 'warning',
//   //   external: true,
//   //   chip: true,
//   //   chipClass: 'bg-light-primary text-primary',
//   //   chipContent: 'PRO',
//   // },

//   {
//     navCap: 'Tables',
//   },
 
//   {
//     displayName: 'Tables',
//     iconName: 'layout',
//     route: 'tables',
//     bgcolor: 'warning',
    
//     children: [
//       // {
//       //   displayName: 'Basic Table',
//       //   iconName: 'point',
//       //   route: 'https://spike-angular-pro-main.netlify.app/tables/basic-table',
//       //   bgcolor: 'tranparent',
//       //   external: true,
//       //   chip: true,
//       //   chipClass: 'bg-light-primary text-primary',
//       //   chipContent: 'PRO',
//       // },
//   {
//     navCap: 'Chart',
//   },
//   // {
//   //   displayName: 'Line',
//   //   iconName: 'chart-line',
//   //   route: 'https://spike-angular-pro-main.netlify.app/charts/line',
//   //   bgcolor: 'error',
//   //   external: true,
//   //   chip: true,
//   //   chipClass: 'bg-light-primary text-primary',
//   //   chipContent: 'PRO',
//   // },

//   // {
//   //   navCap: 'Auth',
//   // },
//   {
//     displayName: 'Login',
//     iconName: 'login',
//     bgcolor: 'secondary',
//     route: '/authentication',
//     children: [
//       {
//         displayName: 'Login',
//         iconName: 'point',
//         bgcolor: 'tranparent',
//         route: '/authentication/login',
//       },
//     ],
//   },
//   // {
//   //   displayName: 'Register',
//   //   iconName: 'user-plus',
//   //   bgcolor: 'warning',
//   //   route: '/authentication',
//   //   children: [
//   //     {
//   //       displayName: 'Register',
//   //       iconName: 'point',
//   //       bgcolor: 'tranparent',
//   //       route: '/authentication/register',
//   //     },
//   //   ],
//   // },
  
//   {
//     displayName: 'Two Steps',
//     iconName: 'zoom-code',
//     bgcolor: 'error',
    
//     route: '/authentication',
//     children: [
//       // {
//       //   displayName: 'Side Two Steps',
//       //   iconName: 'point',
//       //   bgcolor: 'tranparent',
//       //   external: true,
//       //   chip: true,
//       //   chipClass: 'bg-light-primary text-primary',
//       //   chipContent: 'PRO',
//       //   route: 'https://spike-angular-pro-main.netlify.app/authentication/side-two-steps',
//       // },
      
//     ],
//   },
//   // {
//   //   displayName: 'Error',
//   //   iconName: 'alert-circle',
//   //   route: 'https://spike-angular-pro-main.netlify.app/authentication/error',
//   //   bgcolor: 'primary',
//   //   external: true,
//   //   chip: true,
//   //   chipClass: 'bg-light-primary text-primary',
//   //   chipContent: 'PRO',
//   // },
  
// ]
//   }
]
