import type { RequestKind } from './incoming-requests';

/** The tabs of the member's requests page, as the API names them (L2-047). */
export type MemberRequestTab = 'all' | 'bookings' | 'quotes' | 'orders' | 'declined';

export type MemberRequestStatus = 'new' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export interface MemberRequestRow {
  id: string;
  kind: RequestKind;
  kindLabel: string;
  title: string;
  business: string;
  businessSlug: string;
  /** The date and mode of a meeting, or the delivery and price of an order; `null` for a quote. */
  detail: string | null;
  sentAt: string;
  status: MemberRequestStatus;
  statusLabel: string;
}

export interface MemberRequestCounts {
  all: number;
  bookings: number;
  quotes: number;
  orders: number;
  declined: number;
}

/** The answer of `GET /api/requests`. */
export interface MemberRequests {
  tab: MemberRequestTab;
  counts: MemberRequestCounts;
  open: number;
  awaiting: number;
  rows: MemberRequestRow[];
  nextCursor: string | null;
}

export interface DetailLine {
  label: string;
  value: string;
}

export interface TimelineStep {
  title: string;
  meta: string | null;
  at: string | null;
  state: 'complete' | 'current' | 'stopped' | 'upcoming';
}

export interface Callout {
  tone: 'info' | 'success' | 'warning';
  title: string;
  text: string;
  /** The business's own words, for a declined request. */
  quote: string | null;
}

/** The answer of `GET /api/requests/{id}`. */
export interface MemberRequestDetail {
  id: string;
  kind: RequestKind;
  kindLabel: string;
  title: string;
  business: string;
  businessSlug: string;
  categorySlug: string;
  categoryWord: string;
  ownerFirstName: string;
  status: MemberRequestStatus;
  statusLabel: string;
  callout: Callout;
  details: DetailLine[];
  timeline: TimelineStep[];
  canCancel: boolean;
  cancelLabel: string;
  shortNotice: boolean;
  canAskAgain: boolean;
  canAddToCalendar: boolean;
  conversationId: string | null;
  unanswered: boolean;
}

/** What cancelling a request, or taking the cancel back, did. */
export interface CancelDecision {
  id: string;
  status: MemberRequestStatus;
  statusLabel: string;
  business: string;
  /** Until when the cancel can be taken back. */
  undoUntil: string | null;
}
