import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Member, SESSION_API, SessionDto, SignInRequest } from 'api';
import { catchError, map, of, switchMap, tap, Observable } from 'rxjs';

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
  private readonly google = signal(false);
  private readonly challengeKey = signal<string | null>(null);
  private readonly others = signal(0);

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
  /** Whether Google sign-in is configured; the join and sign-in pages hide its button otherwise (L2-003 AC5). */
  readonly googleSignIn = this.google.asReadonly();
  /** The site key of the bot challenge; null when the join form has none (L2-137 AC2). */
  readonly botChallengeSiteKey = this.challengeKey.asReadonly();
  /** How many other sessions the member has, as the server last reported it (L2-011 AC4). */
  readonly otherSessionCount = this.others.asReadonly();

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
      tap((dto) => {
        this.google.set(dto.googleSignIn === true);
        this.challengeKey.set((!dto.signedIn && dto.botChallengeSiteKey) || null);
        this.others.set((dto.signedIn && dto.otherSessionCount) || 0);
      }),
      map(toState),
      catchError(() => of<SessionState>({ status: 'visitor' })),
      tap((state) => this.current.set(state)),
    );
  }

  /** Signs in (L2-006). Errors reach the caller: the page words them. */
  signIn(request: SignInRequest): Observable<SessionState> {
    return this.api.signIn(request).pipe(
      tap((dto) => this.others.set((dto.signedIn && dto.otherSessionCount) || 0)),
      map(toState),
      tap((state) => this.current.set(state)),
    );
  }

  /** Signs out of this session only (L2-011 AC2). */
  signOut(): Observable<void> {
    return this.api.signOut().pipe(tap(() => this.current.set({ status: 'visitor' })));
  }

  /**
   * Ends every other session of the member (L2-011 AC5), then reads the session again: the count
   * shown afterwards is the server's, never assumed.
   */
  signOutOthers(): Observable<void> {
    return this.api.signOutOthers().pipe(
      switchMap(() => this.resolve()),
      map(() => undefined),
    );
  }

  /** The server ended the session (L2-116): the app no longer treats the user as a member. */
  expire(): void {
    this.current.set({ status: 'visitor' });
  }
}
