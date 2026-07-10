import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class TemplatePageTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot): void {
    const builtTitle = this.buildTitle(routerState);

    // 1. Check builtTitle from standard Angular route title property
    if (builtTitle !== undefined && builtTitle !== '') {
      this.title.setTitle(`SVK E-Com | ${builtTitle}`);
      return;
    }

    // 2. Traversal to find deepest active route leaf
    let route = routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const dataTitle = route.data && route.data['title'];
    if (dataTitle) {
      this.title.setTitle(`SVK E-Com | ${dataTitle}`);
      return;
    }

    // 3. Dynamic human-readable fallback from current URL path
    const url = routerState.url.split('?')[0].split('#')[0];
    if (url === '/' || url === '' || url === '/home') {
      this.title.setTitle('SVK E-Com | Enterprise ERP & Multi-Vendor OS');
      return;
    }

    // Derive readable title from URL segments (e.g. /components/crm-contacts -> CRM Contacts)
    const segments = url
      .split('/')
      .filter(s => s && s !== 'components' && s !== 'pages' && s !== 'dashboard');

    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      const formatted = lastSegment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      this.title.setTitle(`SVK E-Com | ${formatted}`);
    } else {
      this.title.setTitle('SVK E-Com | Enterprise Cockpit');
    }
  }
}
