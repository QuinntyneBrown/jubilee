/** What the account page shows (`GET /api/account`, L2-013, L2-014, L2-015). */
export interface Account {
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

/** The six fields of the profile form (`PUT /api/account/profile`). */
export interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string | null;
  postalCode: string | null;
  homeChurch: string | null;
  homeChurchAddress: string | null;
  pronouns: string | null;
}

export interface EmailChangeRequest {
  email: string;
  currentPassword: string;
}

export interface PasswordChangeRequest {
  currentPassword: string | null;
  newPassword: string;
  repeatPassword: string;
}

export type EmailChangeOutcome = 'confirmed' | 'expired' | 'email-in-use';

/** The five switches (L2-016) and how often. */
export type PreferenceSetting = 'messages' | 'requests' | 'reminders' | 'new-businesses' | 'tips';

export type PreferenceFrequency = 'as-it-happens' | 'daily-summary';

export interface NotificationPreferences {
  messages: boolean;
  requests: boolean;
  reminders: boolean;
  newBusinesses: boolean;
  tips: boolean;
  frequency: PreferenceFrequency;
}
