import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
    let clean = (endpoint || '').replace(/^\/+/, '');
    if (clean.toLowerCase().startsWith('api/')) {
      clean = clean.substring(4);
    }
    return clean;
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

  private serializeParams(params?: HttpParams | any): string {
    if (!params) return '';
    if (params instanceof HttpParams) {
      return params.toString();
    }
    if (typeof params === 'object') {
      try {
        return Object.keys(params)
          .sort()
          .map(k => `${k}=${encodeURIComponent(params[k])}`)
          .join('&');
      } catch {
        return JSON.stringify(params);
      }
    }
    return String(params);
  }

  /**
   * SEC-14: Proper SWR (Stale-While-Revalidate) implementation.
   * - Cache HIT (valid, non-expired): returns cached data immediately via of()
   * - Cache MISS / expired: fetches from network, populates cache on success
   * - Mutating methods (post/put/patch/delete) call clearCache() to invalidate
   */
  getApi(endpoint: string, params?: HttpParams | any): Observable<any> {
    const clean    = this.cleanEndpoint(endpoint);
    const cacheKey = `${clean}|${this.serializeParams(params)}`;

    // Cache HIT — return stale data immediately
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.value);
    }

    // Cache MISS — fetch from network and populate cache
    return this.http.get(
      `${this.apiUrl}/${clean}`,
      { params }
    ).pipe(
      tap(response => {
        this.cache.set(cacheKey, {
          value:     response,
          expiresAt: Date.now() + this.CACHE_TTL_MS
        });
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Invalidate cache entries related to the target endpoint resource prefix.
   * E.g. 'leave/apply' -> invalidates all 'leave' cache entries.
   */
  invalidateCacheForEndpoint(endpoint: string): void {
    const clean = this.cleanEndpoint(endpoint);
    const resourcePrefix = clean.split('/')[0].split('?')[0].toLowerCase();
    
    if (!resourcePrefix) {
      this.clearCache();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(resourcePrefix + '|') || key.startsWith(resourcePrefix + '/')) {
        this.cache.delete(key);
      }
    }
  }

  postApi(endpoint: string, payload: any): Observable<any> {
    this.invalidateCacheForEndpoint(endpoint);
    return this.http.post(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  putApi(endpoint: string, payload: any): Observable<any> {
    this.invalidateCacheForEndpoint(endpoint);
    return this.http.put(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  patchApi(endpoint: string, payload: any): Observable<any> {
    this.invalidateCacheForEndpoint(endpoint);
    return this.http.patch(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteApi(endpoint: string): Observable<any> {
    this.invalidateCacheForEndpoint(endpoint);
    return this.http.delete(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  postFormData(endpoint: string, payload: FormData): Observable<any> {
    this.invalidateCacheForEndpoint(endpoint);
    return this.http.post(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  putFormData(endpoint: string, payload: FormData): Observable<any> {
    this.invalidateCacheForEndpoint(endpoint);
    return this.http.put(
      `${this.apiUrl}/${this.cleanEndpoint(endpoint)}`,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    // SEC-15: Only log in development — prevent internal API paths leaking to users in production
    if (!environment.production) {
      console.error('[CommonService] HTTP error:', error);
    }
    return throwError(() => error);
  }
}


