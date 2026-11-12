import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BugReportRequest,
  CheckInRequest,
  FeedbackItem,
  KudosBusiness,
  KudosRequest,
  RatingRequest,
  StoredScreenshot,
} from '../models/feedback';

/**
 * Contract of member feedback (L1-029, ADR 0043). The member is the one of the session; a repeat
 * of a send with the same key returns the first answer (L2-132).
 */
export interface FeedbackApi {
  /** The member's own ratings, bug reports and kudos, newest first (L2-213). */
  mine(): Observable<FeedbackItem[]>;
  /** The businesses the member may send kudos to (L2-212 AC8). */
  kudosBusinesses(): Observable<KudosBusiness[]>;
  sendRating(request: RatingRequest, idempotencyKey: string): Observable<FeedbackItem>;
  sendBugReport(request: BugReportRequest, idempotencyKey: string): Observable<FeedbackItem>;
  sendKudos(request: KudosRequest, idempotencyKey: string): Observable<FeedbackItem>;
  /** Stores a picture for the bug report that is sent next (L2-212 AC6). */
  uploadScreenshot(picture: Blob): Observable<StoredScreenshot>;
  /** Creates or replaces the check-in with this id (L2-211). */
  saveCheckIn(id: string, request: CheckInRequest): Observable<void>;
}

export const FEEDBACK_API = new InjectionToken<FeedbackApi>('FEEDBACK_API');

@Injectable()
export class HttpFeedbackApi implements FeedbackApi {
  private readonly http = inject(HttpClient);

  mine(): Observable<FeedbackItem[]> {
    return this.http.get<FeedbackItem[]>('/api/feedback');
  }

  kudosBusinesses(): Observable<KudosBusiness[]> {
    return this.http.get<KudosBusiness[]>('/api/feedback/businesses');
  }

  sendRating(request: RatingRequest, idempotencyKey: string): Observable<FeedbackItem> {
    return this.send('ratings', request, idempotencyKey);
  }

  sendBugReport(request: BugReportRequest, idempotencyKey: string): Observable<FeedbackItem> {
    return this.send('bug-reports', request, idempotencyKey);
  }

  sendKudos(request: KudosRequest, idempotencyKey: string): Observable<FeedbackItem> {
    return this.send('kudos', request, idempotencyKey);
  }

  uploadScreenshot(picture: Blob): Observable<StoredScreenshot> {
    const form = new FormData();
    form.append('file', picture, 'screenshot');
    return this.http.post<StoredScreenshot>('/api/feedback/screenshots', form);
  }

  saveCheckIn(id: string, request: CheckInRequest): Observable<void> {
    return this.http.put<void>(`/api/feedback/check-ins/${encodeURIComponent(id)}`, request);
  }

  private send(path: string, request: object, idempotencyKey: string): Observable<FeedbackItem> {
    return this.http.post<FeedbackItem>(`/api/feedback/${path}`, request, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }
}
