import { Injectable } from '@angular/core';
import { SessionService } from './session.service';

@Injectable({
 providedIn:'root'
})
export class PermissionService{

constructor(
 private session:SessionService
){}

hasPermission(
 menuId:number,
 action:string
):boolean{

 const permissions=
 this.session.getPermissions();

 return permissions.some(
 (x:any)=>

 x.menu_id===menuId &&
 x.action===action
 );

}

}   