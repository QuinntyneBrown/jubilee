/** The answer of `GET /api/me/navigation`: the counts the chrome shows a member. */
export interface NavigationSummary {
  unreadConversationCount: number;
  unreadNotificationCount: number;
  newRequestCount: number;
  ownsListing: boolean;
  /** The member is on the verification team (L2-098 AC3). */
  isVerifier?: boolean;
  /** Listings ready to review; only counted for the team. */
  verificationCount?: number;
}
