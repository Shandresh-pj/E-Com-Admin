import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, switchMap, map, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environment/environment';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { RefreshService } from './refresh.service';
import { UserType } from '../Models/role-access';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private refreshService: RefreshService,
    private router: Router,
    private socketService: SocketService
  ) {
    // Listen for socket events to update session
    this.socketService.session$.subscribe((data) => {
      this.sessionService.setSession(data);
    });

    this.socketService.sessionExpired$.subscribe(() => {
      this.logout();
    });

    // An admin changed this user's role access — the socket payload is just
    // a signal, so pull the fresh roles/permissions/menus from the API
    // instead of trusting whatever was pushed over the socket.
    this.socketService.sessionRefresh$.subscribe(() => {
      this.refreshPermissions().subscribe({ error: () => {} });
    });
  }

  // ─── Login ───────────────────────────────────────────────────────────────

  login(data: any): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/auth/login`,
      data
    ).pipe(
      tap((response: any) => {
        // Store access token
        this.tokenService.setToken(response.token);
        // Store refresh token
        if (response.refreshToken) {
          this.tokenService.setRefreshToken(response.refreshToken);
        }
        // Store user + roles
        this.sessionService.setSession(response);
        // Connect Socket
        this.socketService.connect(response.token);
        // Defer refreshPermissions so login navigation completes immediately
        setTimeout(() => {
          this.refreshPermissions().subscribe({ error: () => {} });
        }, 100);
      })
    );
  }

  // ─── Live permissions/menus refresh ────────────────────────────────────────
  // Login no longer returns permissions/menus in the response body — they're
  // fetched here so a role-access change made by an admin can be picked up
  // immediately (triggered by the "permissions-updated" socket event) without
  // requiring the user to log in again.
  //
  // This is called from several independent, uncoordinated places (login,
  // app bootstrap, every socket-pushed permission change) with no shared
  // cancellation between them. A sequence number ensures that if an older
  // call's response happens to resolve after a newer one's, it's ignored
  // instead of clobbering the session back to stale data.
  private permissionsRequestSeq = 0;

  refreshPermissions(): Observable<any> {
    const seq = ++this.permissionsRequestSeq;
    return this.http.get(`${environment.apiUrl}/auth/me/permissions`).pipe(
      tap((data: any) => {
        if (seq === this.permissionsRequestSeq) {
          this.sessionService.setSession(data);
        }
      }),
      catchError((error) => {
        console.warn('[Permissions] Live permissions refresh error:', error);
        return of(null);
      })
    );
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  logout(): void {
    const refreshToken = this.tokenService.getRefreshToken();

    if (refreshToken) {
      // Fire-and-forget — revoke on server without blocking the UI
      this.refreshService.revoke(refreshToken).subscribe({ error: () => {} });
    }

    this.tokenService.removeToken();
    this.tokenService.removeRefreshToken();
    this.sessionService.clearSession();
    this.socketService.disconnect();

    this.router.navigate(['/authentication/login']);
  }

  // ─── State checks ─────────────────────────────────────────────────────────

  isLoggedIn(): boolean {
    return this.tokenService.isLoggedIn();
  }

  isSuperAdmin(): boolean {
    const user = this.sessionService.getUser();
    return user?.isSuperAdmin === true || user?.userType === UserType.SUPER_ADMIN;
  }

  getUserType(): string {
    return this.sessionService.getUser()?.userType ?? '';
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  getUser(): any {
    return this.sessionService.getUser();
  }

  getRoles(): any[] {
    return this.sessionService.getRoles();
  }

  getPermissions(): any[] {
    return this.sessionService.getPermissions();
  }

  getMenus(): any[] {
    return this.sessionService.getMenus();
  }
}
