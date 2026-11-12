/** The three things a member sends from the panel and the feedback page (L2-210, L2-212). */
export type FeedbackKind = 'rating' | 'bug-report' | 'kudos';

/** What became of feedback, as the API names it; `feedbackStatusLabel` says it in words. */
export type FeedbackStatus = 'received' | 'read' | 'in-progress' | 'fixed';

/** One item of "Your feedback" (L2-213). */
export interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  createdAt: string;
  status: FeedbackStatus;
  /** The overall rating of a rating. */
  rating: number | null;
  /** The first line of what happened, of a bug report. */
  summary: string | null;
  /** The reference of a bug report, `FB-` and six characters. */
  reference: string | null;
  /** The business kudos were for; null when they were for the Jubilee team. */
  business: string | null;
  /** The team's reply. */
  reply: string | null;
}

/** The parts of Jubilee a rating may score (L2-212 AC2). */
export type FeedbackArea = 'finding' | 'listing' | 'messaging' | 'trust';

export interface RatingRequest {
  rating: number;
  note?: string;
  areas?: Partial<Record<FeedbackArea, number>>;
  mayContact?: boolean;
}

/** Where a bug happened (L2-212 AC4). */
export type BugPlace =
  'browse' | 'business' | 'listing' | 'messages' | 'requests' | 'account' | 'other';

export type BugFrequency = 'once' | 'sometimes' | 'every-time';

export interface BugReportRequest {
  where?: BugPlace;
  happened: string;
  expected?: string;
  frequency?: BugFrequency;
  /** The `page` of the route the member was on. */
  screen?: string;
  /** The app's version. */
  version?: string;
  screenshotIds?: string[];
  mayContact?: boolean;
}

/** The chips of kudos (L2-210 AC5), as they travel. */
export type KudosChip =
  'trust' | 'easy-to-list' | 'quick-replies' | 'church-family' | 'fair-prices';

export interface KudosRequest {
  /** The slug of the business; absent for the Jubilee team. */
  business?: string;
  chips: KudosChip[];
  note?: string;
  showOnPage?: boolean;
  mayContact?: boolean;
}

/** A business the member may send kudos to (L2-212 AC8). */
export interface KudosBusiness {
  slug: string;
  name: string;
}

/** The moment a check-in follows (L2-211). */
export type CheckInMoment = 'request-sent' | 'listing-submitted';

export interface CheckInRequest {
  moment: CheckInMoment;
  score: number;
  note?: string;
}

export interface StoredScreenshot {
  id: string;
}

/** The chips with the words a member reads. */
export const KUDOS_CHIPS: readonly { value: KudosChip; label: string }[] = [
  { value: 'trust', label: 'Found someone I trust' },
  { value: 'easy-to-list', label: 'Easy to list' },
  { value: 'quick-replies', label: 'Quick replies' },
  { value: 'church-family', label: 'Feels like church family' },
  { value: 'fair-prices', label: 'Fair prices' },
];

/** The word of each star, 1 to 5 (L2-210 AC3). */
export const RATING_WORDS: readonly string[] = [
  'Frustrating',
  'Not great',
  'Okay',
  'Good',
  'Love it',
];

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  received: 'Received',
  read: 'Read by the team',
  'in-progress': 'Being worked on',
  fixed: 'Fixed',
};

/** The status of feedback in words (L2-213 AC1). */
export function feedbackStatusLabel(status: FeedbackStatus): string {
  return STATUS_LABELS[status] ?? STATUS_LABELS.received;
}

/** The title of an item of "Your feedback" (L2-213 AC1). */
export function feedbackTitle(item: FeedbackItem): string {
  switch (item.kind) {
    case 'rating':
      return `Rated Jubilee ${item.rating ?? 0} of 5`;
    case 'bug-report':
      return item.summary ?? 'Bug report';
    default:
      return `Kudos to ${item.business ?? 'the Jubilee team'}`;
  }
}
