import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ListingChanges, ListingEditor, MyBusiness, PauseResult } from '../models/my-business';

/** Contract of the owner's workspace (L2-085 to L2-088, L2-096). */
export interface MyBusinessApi {
  overview(): Observable<MyBusiness>;
  editor(): Observable<ListingEditor>;
  save(changes: ListingChanges): Observable<ListingEditor>;
  pause(): Observable<PauseResult>;
  resume(): Observable<PauseResult>;
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

  editor(): Observable<ListingEditor> {
    return this.http.get<ListingEditor>('/api/my-business/listing');
  }

  save(changes: ListingChanges): Observable<ListingEditor> {
    return this.http.put<ListingEditor>('/api/my-business/listing', changes);
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
