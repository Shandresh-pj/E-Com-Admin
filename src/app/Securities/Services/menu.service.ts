import { Injectable } from '@angular/core';
import { SessionService } from './session.service';

@Injectable({
 providedIn:'root'
})
export class MenuService{

constructor(
 private session:SessionService
){}

getMenus(){

 return this.session
 .getMenus()
 .filter(
   (x:any)=>x.isActive
 );

}

}