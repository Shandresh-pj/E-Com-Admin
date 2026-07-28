import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private getStoredItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStoredItem(key: string, value: any): void {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('Failed to save session item:', key, e);
    }
  }

  private userSubject = new BehaviorSubject<any>(this.getStoredItem('session_user', null));
  private rolesSubject = new BehaviorSubject<any[]>(this.getStoredItem('session_roles', []));
  private permissionsSubject = new BehaviorSubject<any[]>(this.getStoredItem('session_permissions', []));
  private menusSubject = new BehaviorSubject<any[]>(this.getStoredItem('session_menus', []));
  private loadedSubject = new BehaviorSubject<boolean>(!!this.getStoredItem('session_user', null));
  private permissionsChangedSubject = new Subject<void>();

  user$: Observable<any> = this.userSubject.asObservable();
  roles$: Observable<any[]> = this.rolesSubject.asObservable();
  permissions$: Observable<any[]> = this.permissionsSubject.asObservable();
  menus$: Observable<any[]> = this.menusSubject.asObservable();
  loaded$: Observable<boolean> = this.loadedSubject.asObservable();
  permissionsChanged$: Observable<void> = this.permissionsChangedSubject.asObservable();

  setSession(data: any): void {
    if (data.user !== undefined) {
      const normalizedUser = {
        ...(data.user ?? {}),
        id: data.user?.id ?? data.user?.userId ?? data.userId,
        userId: data.user?.userId ?? data.user?.id ?? data.userId,
        email: data.user?.email ?? data.email,
        name: data.user?.name ?? data.name,
        userType: data.user?.userType ?? data.user?.user_type ?? data.userType,
        user_type: data.user?.userType ?? data.user?.user_type ?? data.userType,
        companyId: data.user?.companyId ?? data.user?.company_id ?? data.companyId,
        company_id: data.user?.companyId ?? data.user?.company_id ?? data.companyId,
        branchId: data.user?.branchId ?? data.user?.branch_id ?? data.branchId,
        branch_id: data.user?.branchId ?? data.user?.branch_id ?? data.branchId,
        isSuperAdmin: data.user?.isSuperAdmin === true ||
                      data.user?.userType === 'Super_Admin' ||
                      data.user?.userType === 'super_admin' ||
                      data.user?.role === 'super_admin'
      };
      this.userSubject.next(normalizedUser);
      this.setStoredItem('session_user', normalizedUser);
    }

    if (data.roles !== undefined) {
      const roles = data.roles ?? [];
      this.rolesSubject.next(roles);
      this.setStoredItem('session_roles', roles);
    }

    if (data.permissions !== undefined) {
      const permissions = data.permissions ?? [];
      this.permissionsSubject.next(permissions);
      this.setStoredItem('session_permissions', permissions);
    }

    if (data.menus !== undefined) {
      const menus = data.menus ?? [];
      this.menusSubject.next(menus);
      this.setStoredItem('session_menus', menus);
    }

    this.loadedSubject.next(true);
    this.permissionsChangedSubject.next();
  }

  getUser(): any {
    return this.userSubject.value ?? {};
  }

  getRoles(): any[] {
    return this.rolesSubject.value ?? [];
  }

  getPermissions(): any[] {
    return this.permissionsSubject.value ?? [];
  }

  getMenus(): any[] {
    return this.menusSubject.value ?? [];
  }

  clearSession(): void {
    this.userSubject.next(null);
    this.rolesSubject.next([]);
    this.permissionsSubject.next([]);
    this.menusSubject.next([]);
    this.loadedSubject.next(false);

    localStorage.removeItem('session_user');
    localStorage.removeItem('session_roles');
    localStorage.removeItem('session_permissions');
    localStorage.removeItem('session_menus');
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
          id: data.userId || data.id,
          userId: data.userId || data.id,
          name: data.name || data.email,
          email: data.email,
          userType: data.userType || data.user_type,
          user_type: data.userType || data.user_type,
          companyId: data.companyId || data.company_id,
          company_id: data.companyId || data.company_id,
          branchId: data.branchId || data.branch_id,
          branch_id: data.branchId || data.branch_id,
          isSuperAdmin: data.isSuperAdmin === true ||
                        data.userType === 'Super_Admin' ||
                        data.userType === 'super_admin' ||
                        data.role === 'super_admin'
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
