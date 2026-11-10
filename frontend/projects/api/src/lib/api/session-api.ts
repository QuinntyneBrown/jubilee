import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionDto } from '../models/session';

/** Contract of the session endpoint. Pages and services depend on the token, not the class. */
export interface SessionApi {
  getSession(): Observable<SessionDto>;
}

export const SESSION_API = new InjectionToken<SessionApi>('SESSION_API');

@Injectable()
export class HttpSessionApi implements SessionApi {
  private readonly http = inject(HttpClient);

  getSession(): Observable<SessionDto> {
    return this.http.get<SessionDto>('/api/session');
  }
}
