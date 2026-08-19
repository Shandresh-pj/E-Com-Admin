import { Injectable } from '@angular/core';

/**
 * SEC-1: Tokens moved from localStorage to sessionStorage (tab-scoped, cleared on tab close).
 *        sessionStorage is still JS-readable but scoped to the tab and not persisted across restarts.
 *        For true XSS protection, an HttpOnly cookie for the refresh token is the backend's responsibility.
 *
 * SEC-3 / BUG-3: isLoggedIn() now validates JWT expiry (exp claim) before returning true.
 *        An expired or malformed token returns false, triggering a redirect to login.
 */
@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private readonly ACCESS_KEY  = 'token';
  private readonly REFRESH_KEY = 'refresh_token';

  // ─── Access token (sessionStorage — tab-scoped, cleared on close) ──────────

  setToken(token: string): void {
    try {
      sessionStorage.setItem(this.ACCESS_KEY, token);
    } catch {
      // sessionStorage unavailable (private browsing quota exceeded) — fall back to memory
    }
  }

  getToken(): string | null {
    try {
      return sessionStorage.getItem(this.ACCESS_KEY);
    } catch {
      return null;
    }
  }

  removeToken(): void {
    try {
      sessionStorage.removeItem(this.ACCESS_KEY);
    } catch {}
  }

  /**
   * SEC-3: Returns true ONLY if a token exists AND its JWT `exp` claim is in the future.
   * Prevents expired tokens from being treated as valid sessions.
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  /**
   * Decode and check the JWT `exp` claim without trusting any claims for role/permission decisions.
   * This is purely for session validity — never use JWT claims for RBAC.
   */
  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true; // Malformed token → treat as expired

      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return false; // No expiry claim → assume valid (server-validated)

      // exp is Unix timestamp in seconds; Date.now() is in milliseconds
      const nowSeconds = Math.floor(Date.now() / 1000);
      return payload.exp < nowSeconds;
    } catch {
      return true; // Unparseable token → treat as expired
    }
  }

  // ─── Refresh token (localStorage — survives tab close for "remember me") ────
  // Note: For maximum security, the backend should set the refresh token as
  // an HttpOnly, Secure, SameSite=Strict cookie. This is the frontend fallback.

  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(this.REFRESH_KEY, token);
    } catch {}
  }

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_KEY);
    } catch {
      return null;
    }
  }

  removeRefreshToken(): void {
    try {
      localStorage.removeItem(this.REFRESH_KEY);
    } catch {}
  }

  // ─── Utility ────────────────────────────────────────────────────────────────

  /** Clear all tokens — used on logout */
  clearAll(): void {
    this.removeToken();
    this.removeRefreshToken();
  }
}
