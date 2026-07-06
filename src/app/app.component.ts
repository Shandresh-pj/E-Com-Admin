import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  title = 'Spike Angular Admin Template';

  constructor(
    private tokenService: TokenService,
    private socketService: SocketService,
    private sessionService: SessionService,
    private authService: AuthService
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
  }
}
