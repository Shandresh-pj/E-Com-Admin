// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, tap } from 'rxjs';
// import { environment } from 'src/environment/environment';
// import { TokenService } from './token.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {

//   constructor(
//     private http: HttpClient,
//     private tokenService: TokenService
//   ) {}

//   login(data: any): Observable<any> {

//     return this.http.post(
//       `${environment.apiUrl}/auth/login`,
//       data
//     ).pipe(

//       tap((response: any) => {

//         // Token
//         this.tokenService.setToken(
//           response.token
//         );

//         // User
//         localStorage.setItem(
//           'user',
//           JSON.stringify(response.user)
//         );

//         // Roles
//         localStorage.setItem(
//           'roles',
//           JSON.stringify(response.roles)
//         );

//         // Permissions
//         localStorage.setItem(
//           'permissions',
//           JSON.stringify(response.permissions)
//         );

//         // Menus
//         localStorage.setItem(
//           'menus',
//           JSON.stringify(response.menus)
//         );

//       })

//     );
//   }

//   logout(): void {

//     this.tokenService.removeToken();

//     localStorage.removeItem('user');
//     localStorage.removeItem('roles');
//     localStorage.removeItem('permissions');
//     localStorage.removeItem('menus');
//   }

//   getUser() {
//     return JSON.parse(
//       localStorage.getItem('user') || '{}'
//     );
//   }

//   getRoles() {
//     return JSON.parse(
//       localStorage.getItem('roles') || '[]'
//     );
//   }

//   getPermissions() {
//     return JSON.parse(
//       localStorage.getItem('permissions') || '[]'
//     );
//   }

//   getMenus() {
//     return JSON.parse(
//       localStorage.getItem('menus') || '[]'
//     );
//   }
// }





import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, tap} from 'rxjs';

import { Router } from '@angular/router';

import { environment }
from 'src/environment/environment';

import { TokenService }
from './token.service';

import { SessionService }
from './session.service';

@Injectable({
  providedIn:'root'
})
export class AuthService {

  constructor(

    private http:HttpClient,
    private tokenService:TokenService,
    private sessionService:SessionService,
    private router:Router

  ){}

  login(data:any):Observable<any>{

    return this.http.post(

      `${environment.apiUrl}/auth/login`,
      data

    ).pipe(

      tap((response:any)=>{

        this.tokenService.setToken(
          response.token
        );

        this.sessionService.setSession(
          response
        );

      })

    );

  }

  logout():void{

    this.tokenService.removeToken();

    this.sessionService.clearSession();

    this.router.navigate([
      '/authentication/login'
    ]);

  }

  isLoggedIn():boolean{

    return this.tokenService
    .isLoggedIn();

  }

  getUser() {
    return JSON.parse(
      localStorage.getItem('user') || '{}'
    );
  }

  getRoles() {
    return JSON.parse(
      localStorage.getItem('roles') || '[]'
    );
  }

  getPermissions() {
    return JSON.parse(
      localStorage.getItem('permissions') || '[]'
    );
  }

  getMenus() {
    return JSON.parse(
      localStorage.getItem('menus') || '[]'
    );
  }

}

