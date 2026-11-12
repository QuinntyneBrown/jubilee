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
      /** Present while an owner owes an agreement to an updated statement of faith (L2-075 AC3). */
      statementDue?: StatementDue;
    };

/** The agreement an owner owes to an updated statement of faith (L2-075 AC3, AC6). Dates are `yyyy-MM-dd`. */
export interface StatementDue {
  /** The version to agree to: the date the statement was last updated. */
  version: string;
  updatedOn: string;
  /** The last day to agree, 30 days after `updatedOn`. */
  agreeBy: string;
  /** Whether that day has passed and the owner's live listings are paused. */
  overdue: boolean;
  /** The business the agreement concerns. */
  business: string;
}

/** A signed-in member, as the chrome and the pages show them. */
export interface Member {
  firstName: string;
  displayName: string;
  initials: string;
  email: string;
  emailConfirmed: boolean;
  emailBounced: boolean;
  agreementRequired: boolean;
  /** The agreement owed to an updated statement of faith; null when none is (L2-075 AC3). */
  statementDue: StatementDue | null;
}

/** The body of `POST /api/session`. */
export interface SignInRequest {
  email: string;
  password: string;
  keepSignedIn: boolean;
}
