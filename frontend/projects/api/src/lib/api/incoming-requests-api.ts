import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IncomingRequests, IncomingTab, RequestDecision } from '../models/incoming-requests';

/** Contract of the owner's side of requests (L2-051 to L2-053, L2-225). */
export interface IncomingRequestsApi {
  list(tab: IncomingTab): Observable<IncomingRequests>;
  confirm(id: string): Observable<RequestDecision>;
  undoConfirm(id: string): Observable<RequestDecision>;
  decline(id: string, reason: string, message: string): Observable<RequestDecision>;
  /** Marks a confirmed order fulfilled (L2-225). */
  fulfil(id: string): Observable<RequestDecision>;
}

export const INCOMING_REQUESTS_API = new InjectionToken<IncomingRequestsApi>(
  'INCOMING_REQUESTS_API',
);

@Injectable()
export class HttpIncomingRequestsApi implements IncomingRequestsApi {
  private readonly http = inject(HttpClient);

  list(tab: IncomingTab): Observable<IncomingRequests> {
    return this.http.get<IncomingRequests>('/api/my-business/requests', { params: { tab } });
  }

  confirm(id: string): Observable<RequestDecision> {
    return this.http.post<RequestDecision>(`/api/my-business/requests/${id}/confirm`, {});
  }

  undoConfirm(id: string): Observable<RequestDecision> {
    return this.http.post<RequestDecision>(`/api/my-business/requests/${id}/confirm/undo`, {});
  }

  decline(id: string, reason: string, message: string): Observable<RequestDecision> {
    return this.http.post<RequestDecision>(`/api/my-business/requests/${id}/decline`, {
      reason,
      message,
    });
  }

  fulfil(id: string): Observable<RequestDecision> {
    return this.http.post<RequestDecision>(`/api/my-business/requests/${id}/fulfil`, {});
  }
}
