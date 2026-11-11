import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfirmEmailResponse, JoinRequest, JoinResponse } from '../models/account';

/** Contract of the account endpoints: joining, confirming the e-mail, the agreement. */
export interface AccountApi {
  join(request: JoinRequest): Observable<JoinResponse>;
  resendConfirmation(): Observable<void>;
  confirmEmail(token: string): Observable<ConfirmEmailResponse>;
  acceptAgreement(): Observable<void>;
}

export const ACCOUNT_API = new InjectionToken<AccountApi>('ACCOUNT_API');

@Injectable()
export class HttpAccountApi implements AccountApi {
  private readonly http = inject(HttpClient);

  join(request: JoinRequest): Observable<JoinResponse> {
    return this.http.post<JoinResponse>('/api/account/join', request);
  }

  resendConfirmation(): Observable<void> {
    return this.http.post<void>('/api/account/confirmation/resend', {});
  }

  confirmEmail(token: string): Observable<ConfirmEmailResponse> {
    return this.http.post<ConfirmEmailResponse>('/api/account/confirmation', { token });
  }

  acceptAgreement(): Observable<void> {
    return this.http.post<void>('/api/account/agreement', {});
  }
}
