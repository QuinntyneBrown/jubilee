import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  FeaturedListing,
  FeaturedWeek,
  ReportActionKind,
  ReportDetail,
  ReportFilter,
  ReportList,
} from '../models/moderation';
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
  reports(filter: ReportFilter): Observable<ReportList>;
  /** Opens a report: it moves to review and a reported conversation's messages come with it (L2-105, L2-063). */
  openReport(id: string): Observable<ReportDetail>;
  applyReportAction(
    id: string,
    kind: ReportActionKind,
    resolutionNote: string,
    messageText: string | null,
  ): Observable<ReportDetail>;
  featuredWeeks(): Observable<FeaturedWeek[]>;
  featuredCandidates(search: string): Observable<FeaturedListing[]>;
  setFeaturedWeek(startDate: string, listingIds: string[]): Observable<FeaturedWeek>;
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

  reports(filter: ReportFilter): Observable<ReportList> {
    return this.http.get<ReportList>('/api/admin/reports', { params: { status: filter } });
  }

  openReport(id: string): Observable<ReportDetail> {
    return this.http.post<ReportDetail>(`/api/admin/reports/${id}/open`, null);
  }

  applyReportAction(
    id: string,
    kind: ReportActionKind,
    resolutionNote: string,
    messageText: string | null,
  ): Observable<ReportDetail> {
    return this.http.post<ReportDetail>(`/api/admin/reports/${id}/actions`, {
      kind,
      resolutionNote,
      ...(messageText === null ? {} : { messageText }),
    });
  }

  featuredWeeks(): Observable<FeaturedWeek[]> {
    return this.http
      .get<{ weeks: FeaturedWeek[] }>('/api/admin/featured')
      .pipe(map((answer) => answer.weeks));
  }

  featuredCandidates(search: string): Observable<FeaturedListing[]> {
    const params: Record<string, string> = search ? { q: search } : {};
    return this.http
      .get<{ items: FeaturedListing[] }>('/api/admin/featured/candidates', { params })
      .pipe(map((answer) => answer.items));
  }

  setFeaturedWeek(startDate: string, listingIds: string[]): Observable<FeaturedWeek> {
    return this.http.put<FeaturedWeek>(`/api/admin/featured-weeks/${startDate}`, { listingIds });
  }
}
