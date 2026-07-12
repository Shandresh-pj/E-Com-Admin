import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environment/environment';

/**
 * Single shared HTTP client for all feature components.
 * Implements a Stale-While-Revalidate caching pattern for GET requests to make the frontend
 * instantly responsive while keeping data fresh in the background.
 */
@Injectable({
  providedIn: 'root'
})
export class CommonService {

  private apiUrl = environment.apiUrl;
  private cache = new Map<string, any>();

  constructor(private http: HttpClient) {}

  /**
   * Clear the in-memory cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  getApi(endpoint: string, params?: HttpParams | any): Observable<any> {
    // Generate a unique cache key based on endpoint and stringified params
    const cacheKey = `${endpoint}?${params ? JSON.stringify(params) : ''}`;

    const network$ = this.http.get(
      `${this.apiUrl}/${endpoint}`,
      { params }
    ).pipe(
      tap(response => {
        this.cache.set(cacheKey, response);
      }),
      catchError(this.handleError)
    );

    // If cache hit, emit cached data instantly while refreshing in the background
    if (this.cache.has(cacheKey)) {
      const cachedVal = this.cache.get(cacheKey);
      return new Observable(subscriber => {
        // Emit cached value immediately
        subscriber.next(cachedVal);

        // Fetch fresh data in the background
        const subscription = network$.subscribe({
          next: (freshVal) => {
            // Only emit if the response actually changed to minimize UI paint cycles
            if (JSON.stringify(freshVal) !== JSON.stringify(cachedVal)) {
              subscriber.next(freshVal);
            }
            subscriber.complete();
          },
          error: (err) => {
            // Avoid failing the stream if we have cache, just complete it
            console.warn(`[CommonService] Background fetch failed for ${endpoint}:`, err);
            subscriber.complete();
          }
        });

        return () => subscription.unsubscribe();
      });
    }

    return network$;
  }

  postApi(endpoint: string, payload: any): Observable<any> {
    this.clearCache();
    return this.http.post(
      `${this.apiUrl}/${endpoint}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  putApi(endpoint: string, payload: any): Observable<any> {
    this.clearCache();
    return this.http.put(
      `${this.apiUrl}/${endpoint}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteApi(endpoint: string): Observable<any> {
    this.clearCache();
    return this.http.delete(
      `${this.apiUrl}/${endpoint}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  postFormData(endpoint: string, payload: FormData): Observable<any> {
    this.clearCache();
    return this.http.post(
      `${this.apiUrl}/${endpoint}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  putFormData(endpoint: string, payload: FormData): Observable<any> {
    this.clearCache();
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
