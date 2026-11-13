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
import { AdminListing, AdminListings } from '../models/admin-listings';

/** Contract of the Jubilee team's endpoints (L2-098 to L2-106, ADR 0057). */
export interface AdminApi {
  /** Every published listing, newest first, or those whose name contains `search` (L2-099). */
  listings(search: string): Observable<AdminListings>;
  listing(id: string): Observable<AdminListing>;
  /** Takes a listing off Jubilee and e-mails the owner the reason (L2-101). */
  takeDown(id: string, reason: string): Observable<AdminListing>;
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

  listings(search: string): Observable<AdminListings> {
    const params: Record<string, string> = {};
    if (search) params['q'] = search;
    return this.http.get<AdminListings>('/api/admin/listings', { params });
  }

  listing(id: string): Observable<AdminListing> {
    return this.http.get<AdminListing>(`/api/admin/listings/${id}`);
  }

  takeDown(id: string, reason: string): Observable<AdminListing> {
    return this.http.post<AdminListing>(`/api/admin/listings/${id}/take-down`, { reason });
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
