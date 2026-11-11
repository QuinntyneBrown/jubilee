import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Account,
  EmailChangeOutcome,
  EmailChangeRequest,
  NotificationPreferences,
  PasswordChangeRequest,
  PreferenceFrequency,
  PreferenceSetting,
  ProfileForm,
} from '../models/profile';

/** Contract of the account page: profile, credentials and e-mail preferences (L2-013 to L2-016). */
export interface ProfileApi {
  getAccount(): Observable<Account>;
  saveProfile(profile: ProfileForm): Observable<Account>;
  requestEmailChange(request: EmailChangeRequest): Observable<void>;
  confirmEmailChange(token: string): Observable<EmailChangeOutcome>;
  changePassword(request: PasswordChangeRequest): Observable<void>;
  getPreferences(): Observable<NotificationPreferences>;
  setSwitch(setting: PreferenceSetting, enabled: boolean): Observable<NotificationPreferences>;
  setFrequency(frequency: PreferenceFrequency): Observable<NotificationPreferences>;
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
}
