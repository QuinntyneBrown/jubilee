import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  Account,
  EmailChangeOutcome,
  EmailChangeRequest,
  MemberSessionView,
  NotificationPreferences,
  PasswordChangeRequest,
  PreferenceFrequency,
  PreferenceSetting,
  ProfileForm,
  UnsubscribeCategory,
} from '../models/profile';

/** Contract of the account page: profile, credentials and e-mail preferences (L2-013 to L2-016). */
export interface ProfileApi {
  getAccount(): Observable<Account>;
  saveProfile(profile: ProfileForm): Observable<Account>;
  requestEmailChange(request: EmailChangeRequest): Observable<void>;
  confirmEmailChange(token: string): Observable<EmailChangeOutcome>;
  changePassword(request: PasswordChangeRequest): Observable<void>;
  /** "Where you're signed in": the member's live sessions, this device first (L2-143 AC3). */
  getSessions(): Observable<MemberSessionView[]>;
  /** Signs one other device out at once (L2-143 AC3). */
  endSession(id: string): Observable<void>;
  getPreferences(): Observable<NotificationPreferences>;
  setSwitch(setting: PreferenceSetting, enabled: boolean): Observable<NotificationPreferences>;
  setFrequency(frequency: PreferenceFrequency): Observable<NotificationPreferences>;
  /**
   * Turns off the category of the e-mail the link came from (L2-224). The signed token is the
   * credential: no session is needed. A link that does not verify is a 404.
   */
  unsubscribe(token: string): Observable<UnsubscribeCategory>;
}

export const PROFILE_API = new InjectionToken<ProfileApi>('PROFILE_API');

@Injectable()
export class HttpProfileApi implements ProfileApi {
  private readonly http = inject(HttpClient);

  getAccount(): Observable<Account> {
    return this.http.get<Account>('/api/account');
  }

  saveProfile(profile: ProfileForm): Observable<Account> {
    return this.http.put<Account>('/api/account/profile', profile);
  }

  requestEmailChange(request: EmailChangeRequest): Observable<void> {
    return this.http.post<void>('/api/account/email-change', request);
  }

  confirmEmailChange(token: string): Observable<EmailChangeOutcome> {
    return new Observable((subscriber) =>
      this.http
        .post<{ outcome: EmailChangeOutcome }>('/api/account/email-change/confirm', { token })
        .subscribe({
          next: (response) => {
            subscriber.next(response.outcome);
            subscriber.complete();
          },
          error: (error: unknown) => subscriber.error(error),
        }),
    );
  }

  changePassword(request: PasswordChangeRequest): Observable<void> {
    return this.http.put<void>('/api/account/password', request);
  }

  getSessions(): Observable<MemberSessionView[]> {
    return this.http.get<MemberSessionView[]>('/api/account/sessions');
  }

  endSession(id: string): Observable<void> {
    return this.http.delete<void>(`/api/account/sessions/${encodeURIComponent(id)}`);
  }

  getPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>('/api/account/notification-preferences');
  }

  setSwitch(setting: PreferenceSetting, enabled: boolean): Observable<NotificationPreferences> {
    return this.http.patch<NotificationPreferences>('/api/account/notification-preferences', {
      setting,
      enabled,
    });
  }

  setFrequency(frequency: PreferenceFrequency): Observable<NotificationPreferences> {
    return this.http.patch<NotificationPreferences>('/api/account/notification-preferences', {
      setting: 'frequency',
      frequency,
    });
  }

  unsubscribe(token: string): Observable<UnsubscribeCategory> {
    return this.http
      .post<{ category: UnsubscribeCategory }>(
        `/api/email/unsubscribe/${encodeURIComponent(token)}`,
        {},
      )
      .pipe(map((answer) => answer.category));
  }
}
