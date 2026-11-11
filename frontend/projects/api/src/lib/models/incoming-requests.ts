/** The tabs of the owner's requests page, as the API names them (L2-051). */
export type IncomingTab = 'new' | 'confirmed' | 'declined' | 'all';

export type RequestKind = 'order' | 'booking' | 'quote';

export interface IncomingRequestRow {
  id: string;
  kind: RequestKind;
  kindLabel: string;
  customerName: string;
  customerInitials: string;
  title: string;
  detail: string;
  sentAt: string;
  status: string;
  statusLabel: string;
  /** An order's total, such as "$528.00 + tax". */
  total: string | null;
  /** A booking's time, or the date a quote is needed by. */
  when: string | null;
}

export interface IncomingCounts {
  new: number;
  confirmed: number;
  declined: number;
  all: number;
}

/** The answer of `GET /api/my-business/requests`. */
export interface IncomingRequests {
  listing: { name: string; slug: string; verified: boolean };
  tab: IncomingTab;
  counts: IncomingCounts;
  repliesFast: boolean;
  rows: IncomingRequestRow[];
}

/** What confirming, undoing or declining a request did. */
export interface RequestDecision {
  id: string;
  status: string;
  statusLabel: string;
  kind: RequestKind;
  customerFirstName: string;
  /** Until when a confirmation can be undone. */
  undoUntil: string | null;
}

export interface DeclineReasonOption {
  value: string;
  label: string;
}

/** The reasons an owner can give when declining (L2-053). */
export const DECLINE_REASONS: DeclineReasonOption[] = [
  { value: 'cant-meet-the-date', label: 'Can’t meet the date' },
  { value: 'out-of-stock', label: 'Out of stock' },
  { value: 'outside-what-i-offer', label: 'Outside what I offer' },
  { value: 'something-else', label: 'Something else' },
];
