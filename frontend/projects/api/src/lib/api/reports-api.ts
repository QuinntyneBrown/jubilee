import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** The four reasons of the report dialog (L2-039). */
export type ReportReason = 'not-real' | 'misleading' | 'bad-experience' | 'other';

export interface ReportRequest {
  reason: ReportReason | null;
  description: string;
}

export interface ReportedListing {
  id: string;
}

/** Contract of the report endpoint: a member's private report of a listing (L2-039). */
export interface ReportsApi {
  /** Sends a report; a repeat with the same key returns the first answer (L2-132). */
  report(slug: string, request: ReportRequest, idempotencyKey: string): Observable<ReportedListing>;
}

export const REPORTS_API = new InjectionToken<ReportsApi>('REPORTS_API');

@Injectable()
export class HttpReportsApi implements ReportsApi {
  private readonly http = inject(HttpClient);

  report(
    slug: string,
    request: ReportRequest,
    idempotencyKey: string,
  ): Observable<ReportedListing> {
    return this.http.post<ReportedListing>(
      `/api/listings/${encodeURIComponent(slug)}/reports`,
      request,
      {
        headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
      },
    );
  }
}
