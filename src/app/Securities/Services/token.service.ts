
import { Injectable } from '@angular/core';

@Injectable({
providedIn:'root'
})
export class TokenService {

private TOKEN='token';

setToken(
token:string
){

localStorage.setItem(
this.TOKEN,
token
);

}

getToken():string|null{

return localStorage.getItem(
this.TOKEN
);

}

removeToken(){

localStorage.removeItem(
this.TOKEN
);

}

isLoggedIn():boolean{

const token=
this.getToken();

return !!token;

}

}