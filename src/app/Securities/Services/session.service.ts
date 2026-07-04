import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private userSubject = new BehaviorSubject<any>(null);
  private rolesSubject = new BehaviorSubject<any[]>([]);
  private permissionsSubject = new BehaviorSubject<any[]>([]);
  private menusSubject = new BehaviorSubject<any[]>([]);
  private loadedSubject = new BehaviorSubject<boolean>(false);
  private permissionsChangedSubject = new Subject<void>();

  user$: Observable<any> = this.userSubject.asObservable();
  roles$: Observable<any[]> = this.rolesSubject.asObservable();
  permissions$: Observable<any[]> = this.permissionsSubject.asObservable();
  menus$: Observable<any[]> = this.menusSubject.asObservable();
  loaded$: Observable<boolean> = this.loadedSubject.asObservable();
  permissionsChanged$: Observable<void> = this.permissionsChangedSubject.asObservable();

  setSession(data: any): void {
    this.userSubject.next(data.user ?? {});
    this.rolesSubject.next(data.roles ?? []);
    this.permissionsSubject.next(data.permissions ?? []);
    this.menusSubject.next(data.menus ?? []);
    this.loadedSubject.next(true);
    this.permissionsChangedSubject.next();
  }

  getUser(): any {
    return this.userSubject.value ?? {};
  }

  getRoles(): any[] {
    return this.rolesSubject.value;
  }

  getPermissions(): any[] {
    return this.permissionsSubject.value;
  }

  getMenus(): any[] {
    return this.menusSubject.value;
  }

  clearSession(): void {
    this.userSubject.next(null);
    this.rolesSubject.next([]);
    this.permissionsSubject.next([]);
    this.menusSubject.next([]);
    this.loadedSubject.next(false);
  }

  isLoaded(): boolean {
    return this.loadedSubject.value;
  }

  hydrateFromToken(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(decoded);

      this.setSession({
        token,
        user: {
          id: data.userId,
          name: data.name || data.email,
          email: data.email,
          userType: data.userType,
          isSuperAdmin: data.isSuperAdmin
        },
        roles: data.roles || [],
        permissions: data.permissions || [],
        menus: data.menus || []
      });
      return true;
    } catch (e) {
      console.error('Failed to hydrate session from token:', e);
      return false;
    }
  }

  waitForLoad(): Observable<boolean> {
    return this.loaded$.pipe(
      filter(loaded => loaded === true),
      take(1)
    );
  }
}
