import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SavedList } from '../models/saved';
import { OWN_OFFLINE_FALLBACK } from './http-context';

/** Contract of the member's private saved list (L2-041, L2-042). */
export interface SavedApi {
  /**
   * The saved list. `forHearts` marks the read the hearts of any page make: offline, the page they
   * are on stays, and they simply do not know what is saved (L2-119).
   */
  list(forHearts?: boolean): Observable<SavedList>;
  saveBusiness(slug: string): Observable<void>;
  unsaveBusiness(slug: string): Observable<void>;
  saveProduct(shopSlug: string, productSlug: string): Observable<void>;
  unsaveProduct(shopSlug: string, productSlug: string): Observable<void>;
  /** Removes an item by its own id, which also serves an item that is no longer available. */
  remove(id: string): Observable<void>;
}

export const SAVED_API = new InjectionToken<SavedApi>('SAVED_API');

@Injectable()
export class HttpSavedApi implements SavedApi {
  private readonly http = inject(HttpClient);

  list(forHearts = false): Observable<SavedList> {
    return this.http.get<SavedList>('/api/saved', {
      context: new HttpContext().set(OWN_OFFLINE_FALLBACK, forHearts),
    });
  }

  saveBusiness(slug: string): Observable<void> {
    return this.http.put<void>(`/api/saved/businesses/${encodeURIComponent(slug)}`, null);
  }

  unsaveBusiness(slug: string): Observable<void> {
    return this.http.delete<void>(`/api/saved/businesses/${encodeURIComponent(slug)}`);
  }

  saveProduct(shopSlug: string, productSlug: string): Observable<void> {
    return this.http.put<void>(this.product(shopSlug, productSlug), null);
  }

  unsaveProduct(shopSlug: string, productSlug: string): Observable<void> {
    return this.http.delete<void>(this.product(shopSlug, productSlug));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/saved/items/${encodeURIComponent(id)}`);
  }

  private product(shopSlug: string, productSlug: string): string {
    return `/api/saved/products/${encodeURIComponent(shopSlug)}/${encodeURIComponent(productSlug)}`;
  }
}
