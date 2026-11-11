import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReferenceAnswerBody, ReferenceRequestView } from '../models/reference';

/** Contract of the anonymous endpoints behind `/reference/:token` (L2-081, L2-082). The token travels in the body. */
export interface ReferenceApi {
  open(token: string): Observable<ReferenceRequestView>;
  answer(body: ReferenceAnswerBody): Observable<void>;
  report(token: string): Observable<void>;
}

export const REFERENCE_API = new InjectionToken<ReferenceApi>('REFERENCE_API');

@Injectable()
export class HttpReferenceApi implements ReferenceApi {
  private readonly http = inject(HttpClient);

  open(token: string): Observable<ReferenceRequestView> {
    return this.http.post<ReferenceRequestView>('/api/reference-requests/open', { token });
  }

  answer(body: ReferenceAnswerBody): Observable<void> {
    return this.http.post<void>('/api/reference-requests/answer', body);
  }

  report(token: string): Observable<void> {
    return this.http.post<void>('/api/reference-requests/report', { token });
  }
}
