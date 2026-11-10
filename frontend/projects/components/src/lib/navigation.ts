/** What the chrome needs to know about the signed-in member; `null` for a visitor. */
export interface ChromeMember {
  displayName: string;
  initials: string;
  ownsListing: boolean;
  unreadConversationCount: number;
  unreadNotificationCount: number;
}

/** The primary destination a page belongs to, marked with `aria-current="page"`. */
export type ChromeSection = 'browse' | 'messages' | 'business' | 'account' | null;
