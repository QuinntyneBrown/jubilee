/** The body of `POST /api/account/join`. */
export interface JoinRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  homeChurch: string;
  agreementAccepted: boolean;
  challengeToken: string | null;
}

/** The answer of a join: the address the confirmation link was sent to. */
export interface JoinResponse {
  email: string;
}

/** What opening a confirmation link did (L2-004). */
export type ConfirmationOutcome = 'confirmed' | 'already-confirmed' | 'expired';

export interface ConfirmEmailResponse {
  outcome: ConfirmationOutcome;
  firstName: string | null;
}

/** Field error codes the API answers a join with (422 `errors`). */
export type JoinFieldCode =
  | 'REQUIRED'
  | 'TOO_LONG'
  | 'EMAIL_INVALID'
  | 'EMAIL_TAKEN'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_BREACHED'
  | 'AGREEMENT_REQUIRED'
  | 'CHALLENGE_FAILED';
