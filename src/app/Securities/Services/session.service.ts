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
    if (!data) return;

    // Detect user object either under data.user or flat at data root
    const rawUserObj = data.user !== undefined ? data.user : (data.id !== undefined || data.userId !== undefined || data.userType !== undefined || data.user_type !== undefined ? data : null);

    if (rawUserObj) {
      const existingUser = this.getUser() || {};
      const mergedUser = { ...existingUser, ...rawUserObj };

      const userTypeVal = mergedUser.userType ?? mergedUser.user_type ?? data.userType ?? data.user_type ?? '';
      const roleVal     = mergedUser.role ?? data.role ?? '';

      const normUserType = String(userTypeVal).toLowerCase().trim();
      const normRole     = String(roleVal).toLowerCase().trim();

      const isSA = mergedUser.isSuperAdmin === true ||
                   data.isSuperAdmin === true ||
                   existingUser.isSuperAdmin === true ||
                   normUserType === 'super_admin' ||
                   normUserType === 'superadmin' ||
                   normUserType === 'super admin' ||
                   normRole === 'super_admin' ||
                   normRole === 'superadmin' ||
                   normRole === 'super admin';

      const normalizedUser = {
        ...mergedUser,
        id: mergedUser.id ?? mergedUser.userId ?? data.id ?? data.userId,
        userId: mergedUser.userId ?? mergedUser.id ?? data.userId ?? data.id,
        email: mergedUser.email ?? data.email,
        name: mergedUser.name ?? data.name,
        userType: userTypeVal || (isSA ? 'Super_Admin' : ''),
        user_type: userTypeVal || (isSA ? 'Super_Admin' : ''),
        role: roleVal || (isSA ? 'Super_Admin' : ''),
        companyId: mergedUser.companyId ?? mergedUser.company_id ?? data.companyId ?? data.company_id,
        company_id: mergedUser.companyId ?? mergedUser.company_id ?? data.companyId ?? data.company_id,
        branchId: mergedUser.branchId ?? mergedUser.branch_id ?? data.branchId ?? data.branch_id,
        branch_id: mergedUser.branchId ?? mergedUser.branch_id ?? data.branchId ?? data.branch_id,
        isSuperAdmin: isSA
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

  /**
   * SEC-2 / SEC-9: hydrateFromToken() NO LONGER trusts any JWT claims for role or
   * permission decisions. The JWT payload is cryptographically unverified on the client
   * — an attacker who edits localStorage can forge isSuperAdmin, userType, permissions.
   *
   * This method now only extracts the minimum identity fields needed to display the
   * UI skeleton (id, name, email) while the app waits for /auth/me/permissions to load.
   *
   * @param token  The raw JWT access token string
   * @returns true if the token was parseable (valid structure), false otherwise
   */
  hydrateFromToken(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(decoded);

      const existingUser = this.getUser() || {};

      const isSA = data.isSuperAdmin === true ||
                   data.userType === 'Super_Admin' ||
                   data.userType === 'SUPER_ADMIN' ||
                   data.userType === 'super_admin' ||
                   existingUser.isSuperAdmin === true;

      const userTypeVal = data.userType || data.user_type || existingUser.userType || (isSA ? 'Super_Admin' : 'Employee');

      this.setSession({
        user: {
          id:         data.userId || data.id || existingUser.id,
          userId:     data.userId || data.id || existingUser.userId,
          name:       data.name   || existingUser.name || data.email || 'User',
          email:      data.email  || existingUser.email || '',
          userType:   userTypeVal,
          user_type:  userTypeVal,
          role:       data.role   || existingUser.role || (isSA ? 'Super_Admin' : 'Employee'),
          companyId:  data.companyId  || data.company_id  || existingUser.companyId || null,
          company_id: data.companyId  || data.company_id  || existingUser.company_id || null,
          branchId:   data.branchId   || data.branch_id   || existingUser.branchId   || null,
          branch_id:  data.branchId   || data.branch_id   || existingUser.branch_id  || null,
          isSuperAdmin: isSA,
        },
      });
      return true;
    } catch {
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
