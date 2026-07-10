import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, map, mergeMap } from 'rxjs/operators';
import { TokenService } from './Securities/Services/token.service';
import { SocketService } from './Securities/Services/socket.service';
import { SessionService } from './Securities/Services/session.service';
import { AuthService } from './Securities/Services/auth.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'E-Com Enterprise Admin';

  constructor(
    private tokenService: TokenService,
    private socketService: SocketService,
    private sessionService: SessionService,
    private authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    const token = this.tokenService.getToken();
    if (token) {
      // Hydrate synchronously from the token first so the UI has something
      // to render immediately, then overwrite with the live truth from the
      // DB — the token was only fresh at login time, so on a page refresh
      // after a live permission change (pushed via socket while the token
      // itself was never reissued), hydrateFromToken alone would silently
      // regress the session back to stale permissions/menus.
      this.sessionService.hydrateFromToken(token);
      this.socketService.connect(token);
      this.authService.refreshPermissions().subscribe({ error: () => {} });
    }

    // Automatically apply route titles to all pages
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let route = this.activatedRoute;
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      mergeMap(route => route.data)
    ).subscribe(data => {
      const pageTitle = data['title'];
      if (pageTitle) {
        this.titleService.setTitle(`${pageTitle} | E-Com Enterprise Admin`);
      } else {
        this.titleService.setTitle('E-Com Enterprise Admin Console');
      }
    });
  }
}
