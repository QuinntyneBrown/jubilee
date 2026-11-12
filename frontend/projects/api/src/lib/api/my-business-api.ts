import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AwayPeriod,
  ListingChanges,
  ListingEditor,
  MyBusiness,
  PauseResult,
} from '../models/my-business';

/** Contract of the owner's workspace (L2-085 to L2-088, L2-096). */
export interface MyBusinessApi {
  overview(): Observable<MyBusiness>;
  /** Chooses which of the owner's businesses the workspace shows from now on (L2-079 AC5). */
  choose(listingId: string): Observable<void>;
  editor(): Observable<ListingEditor>;
  save(changes: ListingChanges): Observable<ListingEditor>;
  pause(): Observable<PauseResult>;
  resume(): Observable<PauseResult>;
  /** Sets the day the owner is back (`yyyy-mm-dd`), or clears the away period with null (L2-062). */
  setAway(until: string | null): Observable<AwayPeriod>;
  addPhoto(file: File): Observable<ListingEditor>;
  movePhoto(id: string, position: number): Observable<ListingEditor>;
  describePhoto(id: string, alt: string): Observable<ListingEditor>;
  removePhoto(id: string): Observable<ListingEditor>;
}

export const MY_BUSINESS_API = new InjectionToken<MyBusinessApi>('MY_BUSINESS_API');

@Injectable()
export class HttpMyBusinessApi implements MyBusinessApi {
  private readonly http = inject(HttpClient);

  overview(): Observable<MyBusiness> {
    return this.http.get<MyBusiness>('/api/my-business');
  }

  choose(listingId: string): Observable<void> {
    return this.http.put<void>('/api/my-business/current', { listingId });
  }

  editor(): Observable<ListingEditor> {
    return this.http.get<ListingEditor>('/api/my-business/listing');
  }

  save(changes: ListingChanges): Observable<ListingEditor> {
    return this.http.put<ListingEditor>('/api/my-business/listing', changes);
  }

  setAway(until: string | null): Observable<AwayPeriod> {
    return this.http.put<AwayPeriod>('/api/my-business/away', { until });
  }

  pause(): Observable<PauseResult> {
    return this.http.post<PauseResult>('/api/my-business/pause', {});
  }

  resume(): Observable<PauseResult> {
    return this.http.post<PauseResult>('/api/my-business/resume', {});
  }

  addPhoto(file: File): Observable<ListingEditor> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ListingEditor>('/api/my-business/photos', form);
  }

  movePhoto(id: string, position: number): Observable<ListingEditor> {
    return this.http.put<ListingEditor>(`/api/my-business/photos/${id}/position`, { position });
  }

  describePhoto(id: string, alt: string): Observable<ListingEditor> {
    return this.http.put<ListingEditor>(`/api/my-business/photos/${id}/alt`, { alt });
  }

  removePhoto(id: string): Observable<ListingEditor> {
    return this.http.delete<ListingEditor>(`/api/my-business/photos/${id}`);
  }
}
