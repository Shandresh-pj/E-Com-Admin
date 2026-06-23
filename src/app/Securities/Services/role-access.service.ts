import { Injectable } from '@angular/core';
import { SessionService } from './session.service';

@Injectable({
  providedIn:'root'
})
export class RoleAccessService {

  constructor(
    private session: SessionService
  ) {}

  hasRole(role: string): boolean {

    const roles = this.session.getRoles();

    return roles.some(
      (x:any) => x.name === role
    );
  }

  hasAnyRole(roles: string[]): boolean {

    const userRoles =
      this.session.getRoles();

    return userRoles.some(
      (x:any) =>
        roles.includes(x.name)
    );
  }

  hasPermission(
    menuId:number,
    action:string
  ):boolean{

    const permissions =
      this.session.getPermissions();

    return permissions.some(
      (x:any)=>

      x.menu_id===menuId &&
      x.action===action
    );
  }

}