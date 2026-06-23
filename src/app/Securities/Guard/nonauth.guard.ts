import { inject } from '@angular/core';

import {
CanMatchFn,
Router
} from '@angular/router';
import { TokenService } from '../Services/token.service';

 

export const NonAuthGuard: CanMatchFn = ()=>{

const router=
inject(Router);

const tokenService=
inject(TokenService);

if(tokenService.getToken()){

return router.createUrlTree([
'/dashboard'
]);

}

return true;

};