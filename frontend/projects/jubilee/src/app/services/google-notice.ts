const NOTICES: Record<string, string> = {
  google: 'We couldn’t sign you in with Google. Try again, or use your e-mail and password.',
  'google-email': 'Use a Google account with a confirmed e-mail, or join with e-mail.',
  'google-cancelled': 'You didn’t finish with Google. Try again, or use your e-mail and password.',
};

/**
 * What the join and sign-in pages say when a Google sign-in comes back without signing the
 * visitor in (L2-003 AC3, AC4 and AC6). `error` is the `error` query parameter the API returned.
 */
export function googleNotice(error: string | null): string | null {
  return NOTICES[error ?? ''] ?? null;
}
