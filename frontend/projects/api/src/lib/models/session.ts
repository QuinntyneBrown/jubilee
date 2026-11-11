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
      isVerifier?: boolean;
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
  /** On the Jubilee verification team (L2-098). */
  isVerifier: boolean;
}
