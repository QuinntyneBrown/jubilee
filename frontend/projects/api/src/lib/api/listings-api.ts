import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ListingPage } from '../models/listing';
import { ProductPage } from '../models/product';

/** Contract of the listing pages: one business or shop at `/b/:slug` and its products. */
export interface ListingsApi {
  getListing(slug: string): Observable<ListingPage>;
  getProduct(slug: string, product: string): Observable<ProductPage>;
}

export const LISTINGS_API = new InjectionToken<ListingsApi>('LISTINGS_API');

@Injectable()
export class HttpListingsApi implements ListingsApi {
  private readonly http = inject(HttpClient);

  getListing(slug: string): Observable<ListingPage> {
    return this.http.get<ListingPage>(`/api/listings/${encodeURIComponent(slug)}`);
  }

  getProduct(slug: string, product: string): Observable<ProductPage> {
    return this.http.get<ProductPage>(
      `/api/listings/${encodeURIComponent(slug)}/products/${encodeURIComponent(product)}`,
    );
  }
}
