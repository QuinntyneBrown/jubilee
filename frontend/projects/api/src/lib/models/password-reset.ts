/** What a reset link is: usable, or expired (used, replaced, unknown and old links all look alike). */
export type ResetLinkState = 'valid' | 'expired';

/** The answer of `POST /api/account/password-resets/inspect`. */
export interface ResetLinkView {
  state: ResetLinkState;
  email: string | null;
}

/** The body of `POST /api/account/password-resets`. */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  repeatPassword: string;
}

/** Field error codes the API answers a reset with (422 `errors`). */
export type ResetFieldCode =
  | 'REQUIRED'
  | 'TOO_LONG'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_BREACHED'
  | 'PASSWORDS_DIFFER'
  | 'EMAIL_INVALID';
