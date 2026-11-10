import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ListingPage } from '../models/listing';

/** Contract of the listing pages: one business or shop at `/b/:slug`. */
export interface ListingsApi {
  getListing(slug: string): Observable<ListingPage>;
}

export const LISTINGS_API = new InjectionToken<ListingsApi>('LISTINGS_API');

@Injectable()
export class HttpListingsApi implements ListingsApi {
  private readonly http = inject(HttpClient);

  getListing(slug: string): Observable<ListingPage> {
    return this.http.get<ListingPage>(`/api/listings/${encodeURIComponent(slug)}`);
  }
}
