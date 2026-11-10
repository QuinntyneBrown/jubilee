/** The answer of `GET /api/session`: who is using the app. */
export type SessionDto =
  | { signedIn: false }
  | { signedIn: true; firstName: string; displayName: string; initials: string };

/** A signed-in member, as the chrome and the pages show them. */
export interface Member {
  firstName: string;
  displayName: string;
  initials: string;
}
