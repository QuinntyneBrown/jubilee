import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Member, SESSION_API, SessionDto, SignInRequest } from 'api';
import { catchError, map, of, tap, Observable } from 'rxjs';

export type SessionState =
  { status: 'resolving' } | { status: 'visitor' } | { status: 'member'; member: Member };

function toState(dto: SessionDto): SessionState {
  return dto.signedIn
    ? {
        status: 'member',
        member: {
          firstName: dto.firstName,
          displayName: dto.displayName,
          initials: dto.initials,
          email: dto.email ?? '',
          emailConfirmed: dto.emailStatus !== 'unconfirmed',
          emailBounced: dto.emailBounced ?? false,
          agreementRequired: dto.agreementRequired ?? false,
        },
      }
    : { status: 'visitor' };
}

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
  /** The member must confirm the e-mail address before messaging, booking or listing (L2-005). */
  readonly unconfirmed = computed(() => {
    const member = this.member();
    return member !== null && !member.emailConfirmed;
  });
  readonly resolved = computed(() => this.current().status !== 'resolving');

  constructor() {
    // Confirming the address in another tab clears the banner when this tab is focused (L2-005 AC4).
    const view = inject(DOCUMENT).defaultView;
    view?.addEventListener('focus', () => {
      if (this.unconfirmed()) this.resolve().subscribe();
    });
  }

  /** Resolves the session; a failed request leaves the user a visitor. */
  resolve(): Observable<SessionState> {
    return this.api.getSession().pipe(
      map(toState),
      catchError(() => of<SessionState>({ status: 'visitor' })),
      tap((state) => this.current.set(state)),
    );
  }

  /** Signs in (L2-006). Errors reach the caller: the page words them. */
  signIn(request: SignInRequest): Observable<SessionState> {
    return this.api.signIn(request).pipe(
      map(toState),
      tap((state) => this.current.set(state)),
    );
  }

  /** Signs out of this session only (L2-011 AC2). */
  signOut(): Observable<void> {
    return this.api.signOut().pipe(tap(() => this.current.set({ status: 'visitor' })));
  }

  /** The server ended the session (L2-116): the app no longer treats the user as a member. */
  expire(): void {
    this.current.set({ status: 'visitor' });
  }
}
