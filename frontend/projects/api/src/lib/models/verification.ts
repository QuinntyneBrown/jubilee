/** The stages the verification queue lists, as the API names them (L2-099). */
export type QueueStage =
  'ready-to-review' | 'waiting-on-reference' | 'needs-a-decision' | 'changes-requested';

/** How the church reference stands, as the queue and the review show it. */
export type ReferenceState =
  'confirmed' | 'waiting' | 'cant-vouch' | 'doesnt-know' | 'expired' | 'deleted';

export interface QueueTab {
  stage: QueueStage;
  label: string;
  count: number;
}

export interface QueueRow {
  id: string;
  name: string;
  categoryName: string;
  ownerName: string;
  church: string;
  reference: ReferenceState;
  submittedAt: string;
  stage: QueueStage;
  stageLabel: string;
  overdue: boolean;
}

/** The answer of `GET /api/admin/verifications`. */
export interface VerificationQueue {
  total: number;
  readyToReview: number;
  oldestWaitingDays: number | null;
  filter: QueueStage;
  tabs: QueueTab[];
  rows: QueueRow[];
}

export interface ReviewOwner {
  name: string;
  email: string;
  emailConfirmed: boolean;
  memberSince: string;
  otherListings: number;
}

export interface ReviewReference {
  church: string;
  referenceEmail: string;
  state: ReferenceState;
  answeredByName: string | null;
  answeredByRole: string | null;
  answeredAt: string | null;
  answer: 'vouches' | 'cant-vouch' | 'doesnt-know' | null;
  note: string | null;
}

export interface ReviewCheck {
  key: string;
  label: string;
  ticked: boolean;
  tickedBy: string | null;
  tickedAt: string | null;
}

export interface ReviewDecision {
  kind: 'Approved' | 'ChangesRequested' | 'Declined';
  decidedAt: string;
  decidedByName: string;
  note: string | null;
  areas: string[];
}

/** The answer of `GET /api/admin/verifications/:id`. */
export interface VerificationReview {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  about: string | null;
  kind: string;
  categorySlug: string;
  categoryName: string;
  submittedAt: string;
  stage: QueueStage | 'live' | 'declined';
  stageLabel: string;
  owner: ReviewOwner;
  reference: ReviewReference;
  flags: string[];
  checklist: ReviewCheck[];
  decision: ReviewDecision | null;
  changedSinceRequest: string[];
  isOwnListing: boolean;
  cannotDecideBecause: string | null;
}

/** The answer of the three decisions. */
export interface DecisionResult {
  stage: string;
  stageLabel: string;
  decidedAt: string;
  decidedByName: string;
  ownerFirstName: string;
}

/** What the reviewer may ask the owner to change (L2-102). */
export const CHANGE_AREAS: { key: string; label: string }[] = [
  { key: 'tagline', label: 'Tagline or description' },
  { key: 'photos', label: 'Photos' },
  { key: 'category', label: 'Category' },
  { key: 'reference', label: 'Church reference' },
];
