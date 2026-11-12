import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ListingReviews,
  ListingReview,
  ReviewForm,
  ReviewReportRequest,
  ReviewRequest,
} from '../models/reviews';

export interface ReportedReview {
  id: string;
}

/** Contract of the reviews endpoints (L2-237, ADR 0058). */
export interface ReviewsApi {
  /** The reviews of a listing, or of one of its products; anyone reads them. */
  listingReviews(slug: string, product?: string): Observable<ListingReviews>;
  /** What the Write a review screen needs; 403 NOT_ELIGIBLE or OWN_LISTING, 409 ALREADY_REVIEWED. */
  form(slug: string): Observable<ReviewForm>;
  /** Posts a review; a repeat with the same key answers the first (L2-132). */
  write(slug: string, request: ReviewRequest, idempotencyKey: string): Observable<ListingReview>;
  edit(id: string, request: ReviewRequest): Observable<ListingReview>;
  remove(id: string): Observable<void>;
  /** The owner's one public reply; a second replaces the first. */
  reply(id: string, text: string): Observable<ListingReview>;
  report(
    id: string,
    request: ReviewReportRequest,
    idempotencyKey: string,
  ): Observable<ReportedReview>;
}

export const REVIEWS_API = new InjectionToken<ReviewsApi>('REVIEWS_API');

@Injectable()
export class HttpReviewsApi implements ReviewsApi {
  private readonly http = inject(HttpClient);

  listingReviews(slug: string, product?: string): Observable<ListingReviews> {
    const params = product ? new HttpParams().set('product', product) : undefined;
    return this.http.get<ListingReviews>(`/api/listings/${encodeURIComponent(slug)}/reviews`, {
      params,
    });
  }

  form(slug: string): Observable<ReviewForm> {
    return this.http.get<ReviewForm>(`/api/listings/${encodeURIComponent(slug)}/reviews/new`);
  }

  write(slug: string, request: ReviewRequest, idempotencyKey: string): Observable<ListingReview> {
    return this.http.post<ListingReview>(
      `/api/listings/${encodeURIComponent(slug)}/reviews`,
      request,
      {
        headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
      },
    );
  }

  edit(id: string, request: ReviewRequest): Observable<ListingReview> {
    return this.http.put<ListingReview>(`/api/reviews/${encodeURIComponent(id)}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/reviews/${encodeURIComponent(id)}`);
  }

  reply(id: string, text: string): Observable<ListingReview> {
    return this.http.put<ListingReview>(`/api/reviews/${encodeURIComponent(id)}/reply`, { text });
  }

  report(
    id: string,
    request: ReviewReportRequest,
    idempotencyKey: string,
  ): Observable<ReportedReview> {
    return this.http.post<ReportedReview>(
      `/api/reviews/${encodeURIComponent(id)}/reports`,
      request,
      {
        headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
      },
    );
  }
}
