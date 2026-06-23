import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpHeaders
} from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {

    const token = localStorage.getItem('auth_token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getApi(endpoint: string, params?: HttpParams | any): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/${endpoint}`,
      {
        params,
        headers: this.getHeaders()
      }
    ).pipe(
      shareReplay(1),
      catchError(this.handleError)
    );
  }

  postApi(endpoint: string, payload: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${endpoint}`,
      payload,
      {
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  putApi(endpoint: string, payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${endpoint}`,
      payload,
      {
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteApi(endpoint: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${endpoint}`,
      {
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error(error);
    return throwError(() => error);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getUser(): any {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }
}