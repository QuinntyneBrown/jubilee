/** The answer of `GET /api/session`: who is using the app. */
export type SessionDto =
  | {
      signedIn: false;
      /** Whether "Join with Google" and "Continue with Google" can be offered (L2-003 AC5). */
      googleSignIn?: boolean;
      /** The public site key of the bot challenge of the join form, when one is configured (L2-137 AC2). */
      botChallengeSiteKey?: string;
    }
  | {
      signedIn: true;
      googleSignIn?: boolean;
      firstName: string;
      displayName: string;
      initials: string;
      email?: string;
      emailStatus?: 'unconfirmed' | 'confirmed';
      emailBounced?: boolean;
      agreementRequired?: boolean;
      otherSessionCount?: number;
    };

/** A signed-in member, as the chrome and the pages show them. */
export interface Member {
  firstName: string;
  displayName: string;
  initials: string;
  email: string;
  emailConfirmed: boolean;
  emailBounced: boolean;
  agreementRequired: boolean;
}

/** The body of `POST /api/session`. */
export interface SignInRequest {
  email: string;
  password: string;
  keepSignedIn: boolean;
}
