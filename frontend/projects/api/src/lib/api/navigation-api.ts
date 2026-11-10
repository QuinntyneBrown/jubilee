import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NavigationSummary } from '../models/navigation';

/** Contract of the member's navigation summary. */
export interface NavigationApi {
  getSummary(): Observable<NavigationSummary>;
}

export const NAVIGATION_API = new InjectionToken<NavigationApi>('NAVIGATION_API');

@Injectable()
export class HttpNavigationApi implements NavigationApi {
  private readonly http = inject(HttpClient);

  getSummary(): Observable<NavigationSummary> {
    return this.http.get<NavigationSummary>('/api/me/navigation');
  }
}
