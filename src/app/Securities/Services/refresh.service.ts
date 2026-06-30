import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

/**
 * Uses HttpBackend directly to bypass all HTTP interceptors.
 * This prevents the auth interceptor from intercepting its own refresh call.
 */
@Injectable({
  providedIn: 'root'
})
export class RefreshService {

  private http: HttpClient;

  constructor(handler: HttpBackend) {
    this.http = new HttpClient(handler);
  }

  refresh(refreshToken: string): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(
      `${environment.apiUrl}/auth/refresh`,
      { refreshToken }
    );
  }

  revoke(refreshToken: string): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/auth/logout`,
      { refreshToken }
    );
  }
}
