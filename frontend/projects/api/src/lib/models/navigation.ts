/** The answer of `GET /api/me/navigation`: the counts the chrome shows a member. */
export interface NavigationSummary {
  unreadConversationCount: number;
  unreadNotificationCount: number;
  newRequestCount: number;
  ownsListing: boolean;
}
