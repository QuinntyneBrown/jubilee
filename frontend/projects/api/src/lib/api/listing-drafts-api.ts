import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ListingDraft, ListingDraftBody, PublishedListing } from '../models/listing-drafts';

/** Contract of the endpoints behind "List your business" (L2-071 to L2-079). */
export interface ListingDraftsApi {
  /** The draft the member touched last, or null when there is none. */
  current(): Observable<ListingDraft | null>;
  get(id: string): Observable<ListingDraft>;
  create(body: ListingDraftBody): Observable<ListingDraft>;
  save(id: string, body: ListingDraftBody): Observable<ListingDraft>;
  /** Publishes the draft: the listing is live at once (L2-078). */
  publish(id: string, body: ListingDraftBody): Observable<PublishedListing>;
}

export const LISTING_DRAFTS_API = new InjectionToken<ListingDraftsApi>('LISTING_DRAFTS_API');

@Injectable()
export class HttpListingDraftsApi implements ListingDraftsApi {
  private readonly http = inject(HttpClient);

  current(): Observable<ListingDraft | null> {
    return this.http.get<ListingDraft | null>('/api/listing-drafts/current');
  }

  get(id: string): Observable<ListingDraft> {
    return this.http.get<ListingDraft>(`/api/listing-drafts/${id}`);
  }

  create(body: ListingDraftBody): Observable<ListingDraft> {
    return this.http.post<ListingDraft>('/api/listing-drafts', body);
  }

  save(id: string, body: ListingDraftBody): Observable<ListingDraft> {
    return this.http.put<ListingDraft>(`/api/listing-drafts/${id}`, body);
  }

  publish(id: string, body: ListingDraftBody): Observable<PublishedListing> {
    return this.http.post<PublishedListing>(`/api/listing-drafts/${id}/publish`, body);
  }
}
