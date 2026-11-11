import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ResetLinkView, ResetPasswordRequest } from '../models/password-reset';

/** Contract of the forgotten-password endpoints (L2-008, L2-009). The token travels in the body, never in a URL. */
export interface PasswordResetApi {
  /** Asks for a reset link; the answer is the same for any address. */
  requestLink(email: string): Observable<void>;
  inspectLink(token: string): Observable<ResetLinkView>;
  resetPassword(request: ResetPasswordRequest): Observable<void>;
}

export const PASSWORD_RESET_API = new InjectionToken<PasswordResetApi>('PASSWORD_RESET_API');

@Injectable()
export class HttpPasswordResetApi implements PasswordResetApi {
  private readonly http = inject(HttpClient);

  requestLink(email: string): Observable<void> {
    return this.http.post<void>('/api/account/password-reset-requests', { email });
  }

  inspectLink(token: string): Observable<ResetLinkView> {
    return this.http.post<ResetLinkView>('/api/account/password-resets/inspect', { token });
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>('/api/account/password-resets', request);
  }
}
