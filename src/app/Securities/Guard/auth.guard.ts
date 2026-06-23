import { inject } from '@angular/core';
import {
CanMatchFn,
Router
} from '@angular/router';
import { TokenService } from '../Services/token.service';



export const AuthGuard: CanMatchFn = () => {

const router=inject(Router);

const tokenService=
inject(TokenService);

if(tokenService.getToken()){

return true;

}

return router.createUrlTree([
'/authentication/login'
]);

};