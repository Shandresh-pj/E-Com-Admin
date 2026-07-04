import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenService } from './Securities/Services/token.service';
import { SocketService } from './Securities/Services/socket.service';
import { SessionService } from './Securities/Services/session.service';

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
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    const token = this.tokenService.getToken();
    if (token) {
      this.sessionService.hydrateFromToken(token);
      this.socketService.connect(token);
    }
  }
}
