import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AccessRequested {
  id: string;
}

/** Contract of the help endpoint: "Ask for access" on the forbidden page (L2-114). */
export interface HelpApi {
  /** Records the address the member could not open; a repeat with the same key returns the first answer (L2-132). */
  askForAccess(url: string, idempotencyKey: string): Observable<AccessRequested>;
}

export const HELP_API = new InjectionToken<HelpApi>('HELP_API');

@Injectable()
export class HttpHelpApi implements HelpApi {
  private readonly http = inject(HttpClient);

  askForAccess(url: string, idempotencyKey: string): Observable<AccessRequested> {
    return this.http.post<AccessRequested>(
      '/api/help/access-requests',
      { url },
      { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) },
    );
  }
}
