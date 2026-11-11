import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SavedList } from '../models/saved';

/** Contract of the member's private saved list (L2-041, L2-042). */
export interface SavedApi {
  list(): Observable<SavedList>;
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

  list(): Observable<SavedList> {
    return this.http.get<SavedList>('/api/saved');
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
