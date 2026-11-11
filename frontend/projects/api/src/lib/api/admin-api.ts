import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DecisionResult,
  QueueStage,
  ReviewCheck,
  VerificationQueue,
  VerificationReview,
} from '../models/verification';

/** Contract of the verification team's endpoints (L2-098 to L2-104). */
export interface AdminApi {
  queue(stage: QueueStage | null, search: string): Observable<VerificationQueue>;
  review(id: string): Observable<VerificationReview>;
  saveChecklist(id: string, ticked: string[]): Observable<ReviewCheck[]>;
  approve(id: string, note: string | null): Observable<DecisionResult>;
  requestChanges(id: string, areas: string[], message: string): Observable<DecisionResult>;
  decline(id: string, reason: string): Observable<DecisionResult>;
}

export const ADMIN_API = new InjectionToken<AdminApi>('ADMIN_API');

@Injectable()
export class HttpAdminApi implements AdminApi {
  private readonly http = inject(HttpClient);

  queue(stage: QueueStage | null, search: string): Observable<VerificationQueue> {
    const params: Record<string, string> = {};
    if (stage) params['stage'] = stage;
    if (search) params['q'] = search;
    return this.http.get<VerificationQueue>('/api/admin/verifications', { params });
  }

  review(id: string): Observable<VerificationReview> {
    return this.http.get<VerificationReview>(`/api/admin/verifications/${id}`);
  }

  saveChecklist(id: string, ticked: string[]): Observable<ReviewCheck[]> {
    return this.http.put<ReviewCheck[]>(`/api/admin/verifications/${id}/checklist`, { ticked });
  }

  approve(id: string, note: string | null): Observable<DecisionResult> {
    return this.http.post<DecisionResult>(`/api/admin/verifications/${id}/approve`, { note });
  }

  requestChanges(id: string, areas: string[], message: string): Observable<DecisionResult> {
    return this.http.post<DecisionResult>(`/api/admin/verifications/${id}/request-changes`, {
      areas,
      message,
    });
  }

  decline(id: string, reason: string): Observable<DecisionResult> {
    return this.http.post<DecisionResult>(`/api/admin/verifications/${id}/decline`, { reason });
  }
}
