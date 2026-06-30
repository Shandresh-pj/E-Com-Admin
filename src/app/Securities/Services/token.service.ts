import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private readonly ACCESS_KEY  = 'token';
  private readonly REFRESH_KEY = 'refresh_token';

  // ─── Access token ────────────────────────────────────────────────────────

  setToken(token: string): void {
    localStorage.setItem(this.ACCESS_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(this.ACCESS_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // ─── Refresh token ────────────────────────────────────────────────────────

  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  removeRefreshToken(): void {
    localStorage.removeItem(this.REFRESH_KEY);
  }
}
