import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environment/environment';

/**
 * Single shared HTTP client for all feature components.
 * The Authorization header is added automatically by authInterceptor — no manual header needed here.
 */
@Injectable({
  providedIn: 'root'
})
export class CommonService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getApi(endpoint: string, params?: HttpParams | any): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/${endpoint}`,
      { params }
    ).pipe(
      shareReplay(1),
      catchError(this.handleError)
    );
  }

  postApi(endpoint: string, payload: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${endpoint}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  putApi(endpoint: string, payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${endpoint}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteApi(endpoint: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${endpoint}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  postFormData(endpoint: string, payload: FormData): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${endpoint}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  putFormData(endpoint: string, payload: FormData): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${endpoint}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[CommonService]', error);
    return throwError(() => error);
  }
}
