import type { Page, Route } from '@playwright/test';
import { stubAccountData } from './account-data';

// A stand-in for the account page's endpoints (L2-013 to L2-016): profile, e-mail and password change, e-mail
// preferences. What the app sends is kept so a test can prove it (ADR 0009).

export interface FakeAccount {
  firstName: string;
  lastName: string;
  email: string;
  emailStatus: 'confirmed' | 'unconfirmed';
  phone: string | null;
  postalCode: string | null;
  homeChurch: string | null;
  homeChurchAddress: string | null;
  pronouns: string | null;
  memberSince: string;
  profileSavedAt: string | null;
  hasPassword: boolean;
  passwordChangedAt: string | null;
}

export interface FakePreferences {
  messages: boolean;
  requests: boolean;
  reminders: boolean;
  newBusinesses: boolean;
  tips: boolean;
  frequency: 'as-it-happens' | 'daily-summary';
}

export interface FakeProfile {
  /** `fails` answers the account load with a 503. */
  load: 'ok' | 'fails';
  /** `invalid` answers a save with the server's field codes; `offline` with a 503. */
  save: 'ok' | 'invalid' | 'offline';
  /** How an e-mail change is answered. */
  emailChange: 'ok' | 'taken' | 'wrong-password' | 'offline';
  /** How a password change is answered. */
  passwordChange: 'ok' | 'wrong-password' | 'breached' | 'offline';
  /** What opening the link sent to the new address does. */
  confirm: 'confirmed' | 'expired' | 'email-in-use' | 'fails';
  /** `fails` answers the preferences load with a 503. */
  preferencesLoad: 'ok' | 'fails';
  /** How many of the next preference saves fail with a 503. */
  preferenceFailures: number;
  account: FakeAccount;
  preferences: FakePreferences;
  profiles: Record<string, unknown>[];
  emailChanges: Record<string, unknown>[];
  passwordChanges: Record<string, unknown>[];
  confirmed: string[];
  /** Each preference save as the app sent it. */
  preferenceCalls: Record<string, unknown>[];
}

export const ACCOUNT: FakeAccount = {
  firstName: 'Joanna',
  lastName: 'Adeyemi',
  email: 'joanna.adeyemi@example.com',
  emailStatus: 'confirmed',
  phone: '416-555-0142',
  postalCode: 'M4C 1A1',
  homeChurch: 'Grace Toronto Church',
  homeChurchAddress: '383 Jarvis Street, Toronto',
  pronouns: null,
  memberSince: '2026-10-02T14:00:00Z',
  profileSavedAt: '2026-11-09T15:00:00Z',
  hasPassword: true,
  passwordChangedAt: '2026-10-14T15:00:00Z',
};

export const PREFERENCES: FakePreferences = {
  messages: true,
  requests: true,
  reminders: true,
  newBusinesses: false,
  tips: false,
  frequency: 'as-it-happens',
};

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const invalid = (errors: Record<string, string>) => problem(422, { errors });

const SETTING_KEYS: Record<string, keyof FakePreferences> = {
  messages: 'messages',
  requests: 'requests',
  reminders: 'reminders',
  'new-businesses': 'newBusinesses',
  tips: 'tips',
};

export async function stubProfile(
  page: Page,
  initial: Partial<
    Pick<
      FakeProfile,
      | 'load'
      | 'save'
      | 'emailChange'
      | 'passwordChange'
      | 'confirm'
      | 'preferencesLoad'
      | 'preferenceFailures'
    >
  > & { account?: Partial<FakeAccount>; preferences?: Partial<FakePreferences> } = {},
): Promise<FakeProfile> {
  const fake: FakeProfile = {
    load: 'ok',
    save: 'ok',
    emailChange: 'ok',
    passwordChange: 'ok',
    confirm: 'confirmed',
    preferencesLoad: 'ok',
    preferenceFailures: 0,
    ...initial,
    account: { ...ACCOUNT, ...initial.account },
    preferences: { ...PREFERENCES, ...initial.preferences },
    profiles: [],
    emailChanges: [],
    passwordChanges: [],
    confirmed: [],
    preferenceCalls: [],
  };
  const body = (route: Route) => (route.request().postDataJSON() ?? {}) as Record<string, unknown>;

  await page.route('**/api/account', (route) =>
    fake.load === 'fails'
      ? route.fulfill(problem(503, { reference: 'JB-ACC-503' }))
      : route.fulfill({ json: fake.account }),
  );

  await page.route('**/api/account/profile', (route) => {
    const sent = body(route);
    fake.profiles.push(sent);
    if (fake.save === 'offline') return route.fulfill(problem(503, { reference: 'JB-ACC-503' }));
    if (fake.save === 'invalid') {
      return route.fulfill(invalid({ phone: 'PHONE_INVALID', postalCode: 'POSTAL_CODE_INVALID' }));
    }
    fake.account = {
      ...fake.account,
      firstName: String(sent['firstName']),
      lastName: String(sent['lastName']),
      phone: (sent['phone'] as string | null) ?? null,
      postalCode: (sent['postalCode'] as string | null) ?? null,
      homeChurch: (sent['homeChurch'] as string | null) ?? null,
      homeChurchAddress: (sent['homeChurchAddress'] as string | null) ?? null,
      pronouns: (sent['pronouns'] as string | null) ?? null,
      profileSavedAt: '2026-11-10T14:00:00Z',
    };
    return route.fulfill({ json: fake.account });
  });

  await page.route('**/api/account/email-change', (route) => {
    fake.emailChanges.push(body(route));
    switch (fake.emailChange) {
      case 'taken':
        return route.fulfill(invalid({ email: 'EMAIL_IN_USE' }));
      case 'wrong-password':
        return route.fulfill(invalid({ currentPassword: 'CURRENT_PASSWORD_INCORRECT' }));
      case 'offline':
        return route.fulfill(problem(503, { reference: 'JB-ACC-503' }));
      default:
        return route.fulfill({ status: 202, body: '' });
    }
  });

  await page.route('**/api/account/email-change/confirm', (route) => {
    fake.confirmed.push(String(body(route)['token']));
    return fake.confirm === 'fails'
      ? route.fulfill(problem(503, { reference: 'JB-VERIFY-502' }))
      : route.fulfill({ json: { outcome: fake.confirm } });
  });

  await page.route('**/api/account/password', (route) => {
    fake.passwordChanges.push(body(route));
    switch (fake.passwordChange) {
      case 'wrong-password':
        return route.fulfill(invalid({ currentPassword: 'CURRENT_PASSWORD_INCORRECT' }));
      case 'breached':
        return route.fulfill(invalid({ newPassword: 'PASSWORD_BREACHED' }));
      case 'offline':
        return route.fulfill(problem(503, { reference: 'JB-ACC-503' }));
      default:
        fake.account = {
          ...fake.account,
          hasPassword: true,
          passwordChangedAt: '2026-11-10T14:00:00Z',
        };
        return route.fulfill({ status: 204, body: '' });
    }
  });

  await page.route('**/api/account/notification-preferences', (route) => {
    if (route.request().method() === 'GET') {
      return fake.preferencesLoad === 'fails'
        ? route.fulfill(problem(503, { reference: 'JB-PREF-503' }))
        : route.fulfill({ json: fake.preferences });
    }
    const sent = body(route);
    fake.preferenceCalls.push(sent);
    if (fake.preferenceFailures > 0) {
      fake.preferenceFailures -= 1;
      return route.fulfill(problem(503, { reference: 'JB-PREF-503' }));
    }
    const setting = String(sent['setting']);
    if (setting === 'frequency') {
      fake.preferences = {
        ...fake.preferences,
        frequency: sent['frequency'] as FakePreferences['frequency'],
      };
    } else {
      fake.preferences = { ...fake.preferences, [SETTING_KEYS[setting]]: sent['enabled'] === true };
    }
    return route.fulfill({ json: fake.preferences });
  });

  // The account page also asks where the data export stands; the default is that none was asked for.
  await stubAccountData(page);

  return fake;
}
