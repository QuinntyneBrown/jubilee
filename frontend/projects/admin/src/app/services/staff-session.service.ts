import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { STAFF_SESSION_API, StaffSessionDto } from 'api';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';

/**
 * The staff session of the admin application (L2-190), resolved once at start-up. `refused` is
 * true when the API answered that the caller is not on an allowed network (L2-192 AC6).
 */
@Injectable({ providedIn: 'root' })
export class StaffSessionService {
  private readonly api = inject(STAFF_SESSION_API);
  readonly staff = signal<StaffSessionDto | null>(null);
  readonly refused = signal(false);

  resolve(): Promise<void> {
    return firstValueFrom(
      this.api.getSession().pipe(
        tap((staff) => this.staff.set(staff)),
        map(() => undefined),
        catchError((error: unknown) => {
          this.staff.set(null);
          this.refused.set(
            error instanceof HttpErrorResponse &&
              error.status === 403 &&
              error.error?.code === 'NETWORK_NOT_ALLOWED',
          );
          return of(undefined);
        }),
      ),
    );
  }

  get isVerifier(): boolean {
    return this.staff()?.roles.includes('verifier') ?? false;
  }

  /** The session ended on the server (L2-190 AC3): forget the staff member. */
  expire(): void {
    this.staff.set(null);
  }

  /** Ends the session on the server (L2-190 AC4); the staff member is forgotten either way. */
  signOut(): Observable<void> {
    return this.api.signOut().pipe(
      catchError(() => of(undefined)),
      tap(() => this.staff.set(null)),
    );
  }

  /** Where the browser goes to start single sign-on (L2-189 AC2). */
  signInUrl(returnUrl: string): string {
    return this.api.signInUrl(returnUrl);
  }
}
