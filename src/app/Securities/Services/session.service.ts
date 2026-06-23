
import { Injectable } from '@angular/core';

@Injectable({
providedIn:'root'
})
export class SessionService{

setSession(data:any){

localStorage.setItem(
'token',
data.token
);

localStorage.setItem(
'user',
JSON.stringify(data.user)
);

localStorage.setItem(
'roles',
JSON.stringify(data.roles)
);

localStorage.setItem(
'permissions',
JSON.stringify(
data.permissions
)
);

localStorage.setItem(
'menus',
JSON.stringify(
data.menus
)
);

}

getUser(){

return JSON.parse(
localStorage.getItem(
'user'
)||'{}'
);

}

getRoles(){

return JSON.parse(
localStorage.getItem(
'roles'
)||'[]'
);

}

getPermissions(){

return JSON.parse(
localStorage.getItem(
'permissions'
)||'[]'
);

}

getMenus(){

return JSON.parse(
localStorage.getItem(
'menus'
)||'[]'
);

}

clearSession(){

localStorage.removeItem(
'token'
);

localStorage.removeItem(
'user'
);

localStorage.removeItem(
'roles'
);

localStorage.removeItem(
'permissions'
);

localStorage.removeItem(
'menus'
);

}

}

