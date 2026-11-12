import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Contract of the statement of faith endpoint: an owner agrees to an updated version (L2-075 AC4). */
export interface StatementOfFaithApi {
  /** Records the agreement to `version`; another version than the current one is refused with 409 `STATEMENT_VERSION`. */
  agree(version: string): Observable<void>;
}

export const STATEMENT_OF_FAITH_API = new InjectionToken<StatementOfFaithApi>(
  'STATEMENT_OF_FAITH_API',
);

@Injectable()
export class HttpStatementOfFaithApi implements StatementOfFaithApi {
  private readonly http = inject(HttpClient);

  agree(version: string): Observable<void> {
    return this.http.post<void>('/api/statement-of-faith/agreement', { version });
  }
}
