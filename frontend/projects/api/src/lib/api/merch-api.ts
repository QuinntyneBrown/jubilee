import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CheckoutRequest, CheckoutStarted, MerchOrder, MerchProduct } from '../models/merch';

/**
 * Contract of Jubilee's merchandise endpoints (L1-034, ADR 0073). None needs a session: a buyer
 * needs no account.
 */
export interface MerchApi {
  /** The Purpose Tee, its fits and sizes and what is left of each (L2-263 AC4). */
  product(): Observable<MerchProduct>;
  /** Starts a checkout; answers the provider's hosted page (L2-267). */
  checkout(request: CheckoutRequest): Observable<CheckoutStarted>;
  /** The order the return page shows, by its reference (L2-269 AC7). */
  order(reference: string): Observable<MerchOrder>;
}

export const MERCH_API = new InjectionToken<MerchApi>('MERCH_API');

@Injectable()
export class HttpMerchApi implements MerchApi {
  private readonly http = inject(HttpClient);

  product(): Observable<MerchProduct> {
    return this.http.get<MerchProduct>('/api/merch/purpose-tee');
  }

  checkout(request: CheckoutRequest): Observable<CheckoutStarted> {
    return this.http.post<CheckoutStarted>('/api/merch/checkout', request);
  }

  order(reference: string): Observable<MerchOrder> {
    return this.http.get<MerchOrder>(`/api/merch/orders/${encodeURIComponent(reference)}`);
  }
}
