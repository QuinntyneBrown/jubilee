import { NavigationSummary } from './navigation';

/** What a notification is about; the page picks its icon from it (L2-064). */
export type NotificationKind =
  'request' | 'message' | 'listing' | 'account' | 'reminder' | 'business';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  /** The path in the app that opening the notification goes to. */
  target: string;
  /** When it happened, as an ISO instant. */
  at: string;
  read: boolean;
}

/** The answer of `GET /api/notifications`: the last 90 days, newest first. */
export interface NotificationList {
  unread: number;
  items: NotificationItem[];
}

export interface UnreadCount {
  unread: number;
}

/** What the open page learns over the event stream (L2-070). */
export type MemberEvent =
  | { type: 'notification'; id: string; item: NotificationItem }
  | { type: 'counts'; counts: NavigationSummary };
