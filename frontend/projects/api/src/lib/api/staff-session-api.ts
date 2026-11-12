import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StaffSessionDto } from '../models/staff-session';

/**
 * Contract of the staff session of the admin application (L2-190). Signing in is a navigation of
 * the browser to `signInUrl`, which hands over to single sign-on (L2-189).
 */
export interface StaffSessionApi {
  getSession(): Observable<StaffSessionDto>;
  signOut(): Observable<void>;
  /** Where the browser goes to sign in, returning to `returnUrl` afterwards. */
  signInUrl(returnUrl: string): string;
}

export const STAFF_SESSION_API = new InjectionToken<StaffSessionApi>('STAFF_SESSION_API');

@Injectable()
export class HttpStaffSessionApi implements StaffSessionApi {
  private readonly http = inject(HttpClient);

  getSession(): Observable<StaffSessionDto> {
    return this.http.get<StaffSessionDto>('/api/staff/session');
  }

  signOut(): Observable<void> {
    return this.http.delete<void>('/api/staff/session');
  }

  signInUrl(returnUrl: string): string {
    return `/api/staff/sign-in/start?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
}
