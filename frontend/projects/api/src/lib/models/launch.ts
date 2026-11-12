/** The answer of `GET /api/launch`: what the launching-soon page needs before it shows its forms (L2-218 AC5). */
export interface LaunchFormSettings {
  /** The public site key of the bot challenge, when one is configured. */
  botChallengeSiteKey?: string;
}

/** The body of `POST /api/launch/notifications` (L2-217). */
export interface LaunchNotificationRequest {
  email: string;
  firstName: string;
  consent: boolean;
  challengeToken: string | null;
}

/** The body of `POST /api/launch/businesses` (L2-216). */
export interface BusinessPreRegistrationRequest {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  area: string;
  website: string;
  description: string;
  consent: boolean;
  challengeToken: string | null;
}

/** Field error codes the launch endpoints answer with (422 `errors`). */
export type LaunchFieldCode =
  | 'REQUIRED'
  | 'TOO_LONG'
  | 'EMAIL_INVALID'
  | 'PHONE_INVALID'
  | 'WEBSITE_INVALID'
  | 'CATEGORY_UNKNOWN'
  | 'CONSENT_REQUIRED'
  | 'CHALLENGE_FAILED';
