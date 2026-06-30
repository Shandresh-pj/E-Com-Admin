import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  setSession(data: any): void {
    localStorage.setItem('token',        data.token         ?? '');
    localStorage.setItem('refresh_token',data.refreshToken  ?? '');
    localStorage.setItem('user',         JSON.stringify(data.user   ?? {}));
    localStorage.setItem('roles',        JSON.stringify(data.roles  ?? []));
    localStorage.setItem('permissions',  JSON.stringify(data.permissions ?? []));
    localStorage.setItem('menus',        JSON.stringify(data.menus  ?? []));
  }

  getUser(): any {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  getRoles(): any[] {
    return JSON.parse(localStorage.getItem('roles') || '[]');
  }

  getPermissions(): any[] {
    return JSON.parse(localStorage.getItem('permissions') || '[]');
  }

  getMenus(): any[] {
    return JSON.parse(localStorage.getItem('menus') || '[]');
  }

  clearSession(): void {
    ['token', 'refresh_token', 'user', 'roles', 'permissions', 'menus'].forEach(
      key => localStorage.removeItem(key)
    );
  }
}
