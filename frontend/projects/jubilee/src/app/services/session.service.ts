import { Injectable, computed, inject, signal } from '@angular/core';
import { Member, SESSION_API } from 'api';
import { catchError, map, of, tap, Observable } from 'rxjs';

export type SessionState =
  { status: 'resolving' } | { status: 'visitor' } | { status: 'member'; member: Member };

/** Holds who is using the app. Resolved once at start-up from `GET /api/session`. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(SESSION_API);
  private readonly current = signal<SessionState>({ status: 'resolving' });

  readonly state = this.current.asReadonly();
  readonly member = computed(() => {
    const state = this.current();
    return state.status === 'member' ? state.member : null;
  });
  readonly resolved = computed(() => this.current().status !== 'resolving');

  /** Resolves the session; a failed request leaves the user a visitor. */
  resolve(): Observable<SessionState> {
    return this.api.getSession().pipe(
      map((dto): SessionState =>
        dto.signedIn
          ? {
              status: 'member',
              member: {
                firstName: dto.firstName,
                displayName: dto.displayName,
                initials: dto.initials,
              },
            }
          : { status: 'visitor' },
      ),
      catchError(() => of<SessionState>({ status: 'visitor' })),
      tap((state) => this.current.set(state)),
    );
  }
}
