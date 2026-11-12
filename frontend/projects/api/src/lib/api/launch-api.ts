import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import {
  BusinessPreRegistrationRequest,
  LaunchFormSettings,
  LaunchNotificationRequest,
} from '../models/launch';

/**
 * Contract of the endpoints of the launching-soon marketing page (L2-216 to L2-218, ADR 0044). The
 * marketing site calls them on its own origin; they need no session.
 */
export interface LaunchApi {
  /** The settings of the forms. Asked once per page; a failure answers no settings. */
  settings(): Observable<LaunchFormSettings>;
  /** Signs up for the launch notice. A repeat is answered as the first time (L2-217 AC5). */
  notify(request: LaunchNotificationRequest): Observable<void>;
  /** Sends a business's details for launch day. Nothing is listed or verified by it (L2-216 AC9). */
  preRegister(request: BusinessPreRegistrationRequest): Observable<void>;
}

export const LAUNCH_API = new InjectionToken<LaunchApi>('LAUNCH_API');

@Injectable()
export class HttpLaunchApi implements LaunchApi {
  private readonly http = inject(HttpClient);
  /** Both forms read the settings; the page asks for them once. */
  private readonly settings$ = this.http.get<LaunchFormSettings>('/api/launch').pipe(
    catchError(() => of({})),
    shareReplay(1),
  );

  settings(): Observable<LaunchFormSettings> {
    return this.settings$;
  }

  notify(request: LaunchNotificationRequest): Observable<void> {
    return this.http.post<void>('/api/launch/notifications', request);
  }

  preRegister(request: BusinessPreRegistrationRequest): Observable<void> {
    return this.http.post<void>('/api/launch/businesses', request);
  }
}
