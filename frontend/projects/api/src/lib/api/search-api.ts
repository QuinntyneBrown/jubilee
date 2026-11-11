import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SearchResults, SearchStart } from '../models/search';

/** Contract of the directory search and of a member's recent searches. */
export interface SearchApi {
  search(query: string): Observable<SearchResults>;
  getStart(): Observable<SearchStart>;
  removeRecent(id: string): Observable<void>;
  clearRecent(): Observable<void>;
}

export const SEARCH_API = new InjectionToken<SearchApi>('SEARCH_API');

@Injectable()
export class HttpSearchApi implements SearchApi {
  private readonly http = inject(HttpClient);

  search(query: string): Observable<SearchResults> {
    return this.http.get<SearchResults>('/api/search', {
      params: new HttpParams().set('q', query),
    });
  }

  getStart(): Observable<SearchStart> {
    return this.http.get<SearchStart>('/api/search/start');
  }

  removeRecent(id: string): Observable<void> {
    return this.http.delete<void>(`/api/search/recent/${encodeURIComponent(id)}`);
  }

  clearRecent(): Observable<void> {
    return this.http.delete<void>('/api/search/recent');
  }
}
