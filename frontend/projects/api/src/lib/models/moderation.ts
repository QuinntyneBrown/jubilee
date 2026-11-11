/** What the verification team sees of reports and featured businesses (L2-105, L2-106). */

export type ReportStatus = 'open' | 'in-review' | 'resolved';

/** The statuses the reports list can be filtered by; `unresolved` is the default. */
export type ReportFilter = 'unresolved' | 'open' | 'in-review' | 'resolved';

export type ReportActionKind =
  'dismiss' | 'message-reporter' | 'message-owner' | 'hold' | 'remove' | 'lift-hold';

/** How a reported listing stands: live, paused, on hold, removed. */
export type ListingState = 'live' | 'paused' | 'on-hold' | 'removed' | 'not-live';

export interface ReportListItem {
  id: string;
  type: 'listing' | 'conversation';
  listing: { name: string; slug: string };
  reason: string;
  description: string;
  reporterName: string;
  createdAt: string;
  status: ReportStatus;
  overdue: boolean;
}

export interface ReportList {
  items: ReportListItem[];
  unresolvedCount: number;
  overdueCount: number;
}

export interface ReportedMessage {
  from: string;
  fromOwner: boolean;
  body: string;
  at: string;
}

export interface ReportAction {
  kind: ReportActionKind;
  resolutionNote: string;
  messageText: string | null;
  by: string;
  at: string;
}

export interface ReportDetail {
  id: string;
  type: 'listing' | 'conversation';
  status: ReportStatus;
  overdue: boolean;
  createdAt: string;
  reporterName: string;
  listing: { name: string; slug: string; state: ListingState };
  entries: { reason: string; description: string; at: string }[];
  /** The messages of a reported conversation, only while the report is unresolved. */
  conversation: { memberName: string; messages: ReportedMessage[] } | null;
  actions: ReportAction[];
  resolutionNote: string | null;
}

export interface FeaturedListing {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  categorySlug: string;
  state: ListingState;
}

export interface FeaturedWeek {
  startDate: string;
  endDate: string;
  active: boolean;
  listings: FeaturedListing[];
}
