import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environment/environment';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { RefreshService } from './refresh.service';
import { UserType } from '../Models/role-access';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private refreshService: RefreshService,
    private router: Router
  ) {}

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
        // Store user, roles, permissions, menus
        this.sessionService.setSession(response);
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
