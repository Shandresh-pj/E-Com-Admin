import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, retry } from 'rxjs/operators';
import { environment } from 'src/environment/environment';

/**
 * Single shared HTTP client for all feature components.
 * Implements a Stale-While-Revalidate (SWR) caching pattern for GET requests
 * to make the frontend instantly responsive while keeping data fresh in background.
 *
 * Cache TTL: 5 minutes — after which the cache entry is evicted and a fresh
 * network request is made. This prevents stale data from persisting across
 * admin changes pushed via the backend.
 */
@Injectable({
  providedIn: 'root'
})
export class CommonService {

  public apiUrl = environment.apiUrl;
  private cache = new Map<string, { value: any; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  /**
   * Clear the in-memory cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  private cleanEndpoint(endpoint: string): string {
    return (endpoint || '').replace(/^\/+/, '');
  }

  private isCacheValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  getApi(endpoint: string, params?: HttpParams | any): Observable<any> {
    const clean = this.cleanEndpoint(endpoint);
    const cacheKey = `${clean}?${params ? JSON.stringify(params) : ''}`;

    const network$ = this.http.get(
      `${this.apiUrl}/${clean}`,
      { params }
    ).pipe(
      retry({ count: 1, delay: 1000 }),
      tap(response => {
        this.cache.set(cacheKey, {
          value: response,
          expiresAt: Date.now() + this.CACHE_TTL_MS
        });
      }),
      catchError(this.handleError)
    );

    // If cache hit (and not expired), emit cached data instantly while refreshing in background
    if (this.isCacheValid(cacheKey)) {
      const cachedVal = this.cache.get(cacheKey)!.value;
      return new Observable(subscriber => {
        // Emit cached value immediately for instant UI response
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
          error: () => {
            // Avoid failing the stream if we have cache, just complete it
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
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  putApi(endpoint: string, payload: any): Observable<any> {
    this.clearCache();
    return this.http.put(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  patchApi(endpoint: string, payload: any): Observable<any> {
    this.clearCache();
    return this.http.patch(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteApi(endpoint: string): Observable<any> {
    this.clearCache();
    return this.http.delete(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  postFormData(endpoint: string, payload: FormData): Observable<any> {
    this.clearCache();
    return this.http.post(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  putFormData(endpoint: string, payload: FormData): Observable<any> {
    this.clearCache();
    return this.http.put(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
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


