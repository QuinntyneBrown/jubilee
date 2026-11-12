import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { OWN_OFFLINE_FALLBACK } from './http-context';
import {
  BrowseHome,
  CategoryFilters,
  CategoryPage,
  CategoryQuery,
  Welcome,
} from '../models/directory';

/** Contract of the public directory: welcome, browse home and category pages. */
export interface DirectoryApi {
  getWelcome(): Observable<Welcome>;
  getHome(): Observable<BrowseHome>;
  getCategory(slug: string, query: CategoryQuery): Observable<CategoryPage>;
  /** How many businesses a set of filters would show, for "Show {n} businesses". */
  countCategory(slug: string, filters: CategoryFilters): Observable<number>;
}

export const DIRECTORY_API = new InjectionToken<DirectoryApi>('DIRECTORY_API');

@Injectable()
export class HttpDirectoryApi implements DirectoryApi {
  private readonly http = inject(HttpClient);

  getWelcome(): Observable<Welcome> {
    return this.http.get<Welcome>('/api/directory/welcome');
  }

  getHome(): Observable<BrowseHome> {
    return this.http.get<BrowseHome>('/api/directory/home', {
      context: new HttpContext().set(OWN_OFFLINE_FALLBACK, true),
    });
  }

  getCategory(slug: string, query: CategoryQuery): Observable<CategoryPage> {
    let params = filterParams(query).set('sort', query.sort).set('page', query.page);
    if (query.term) params = params.set('term', query.term);
    return this.http.get<CategoryPage>(`/api/categories/${encodeURIComponent(slug)}/listings`, {
      params,
    });
  }

  countCategory(slug: string, filters: CategoryFilters): Observable<number> {
    return this.http
      .get<{ count: number }>(`/api/categories/${encodeURIComponent(slug)}/listings/count`, {
        params: filterParams(filters),
      })
      .pipe(map((answer) => answer.count));
  }
}

function filterParams(filters: CategoryFilters): HttpParams {
  let params = new HttpParams();
  if (filters.offers.length) params = params.set('offers', filters.offers.join(','));
  if (filters.areas.length) params = params.set('areas', filters.areas.join(','));
  return params;
}
