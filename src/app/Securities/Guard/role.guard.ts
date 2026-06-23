import { inject } from '@angular/core';
import {
 CanActivateFn,
 ActivatedRouteSnapshot,
 Router
} from '@angular/router';
import { SessionService } from '../Services/session.service';


export const RoleGuard:CanActivateFn=(route)=>{

const router=inject(Router);

const session=
inject(SessionService);

const expectedRoles=
route.data['roles'];

const roles=
session.getRoles();

const hasAccess=
roles.some(
(r:any)=>
expectedRoles.includes(r.name)
);

if(hasAccess){

return true;

}

router.navigate(['/unauthorized']);

return false;

};