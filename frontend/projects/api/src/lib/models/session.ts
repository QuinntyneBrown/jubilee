/** The answer of `GET /api/session`: who is using the app. */
export type SessionDto =
  | { signedIn: false }
  | {
      signedIn: true;
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
