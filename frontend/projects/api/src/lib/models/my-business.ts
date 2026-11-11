/** The owner's workspace: My business, the listing editor, photos, pause and resume (L2-085 to L2-088, L2-096). */

export type BusinessState =
  | 'none'
  | 'draft'
  | 'pending-reference'
  | 'ready-to-review'
  | 'needs-a-decision'
  | 'changes-requested'
  | 'live'
  | 'paused'
  | 'declined';

export interface BusinessStat {
  value: number;
  change: number;
}

export interface BusinessStats {
  views: BusinessStat;
  openRequests: number;
  newSinceYesterday: number;
  unansweredMessages: number;
  saved: number | null;
}

export interface NeedsReply {
  id: string;
  kind: string;
  kindLabel: string;
  customerName: string;
  title: string;
  sentAt: string;
}

export interface BusinessSummary {
  products: number;
  soldOut: number;
  services: number;
  reference: string;
}

export interface BusinessReference {
  church: string;
  referenceEmail: string;
  state: string;
  requestedAt: string;
}

export interface BusinessVerification {
  stage: string;
  stageLabel: string;
  changesRequested: {
    areas: string[];
    message: string;
    reviewerFirstName: string;
    requestedAt: string;
  } | null;
  declined: { reason: string; decidedAt: string } | null;
}

export interface MyBusiness {
  state: BusinessState;
  listingId: string | null;
  name: string | null;
  slug: string | null;
  tagline: string | null;
  categorySlug: string | null;
  subtitle: string;
  paused: boolean;
  pausedAt: string | null;
  /** The instant the owner is back, while an away period is set (L2-062). */
  awayUntil?: string | null;
  justApproved: boolean;
  newRequests: number;
  stats: BusinessStats | null;
  needsReply: NeedsReply[];
  summary: BusinessSummary | null;
  reference: BusinessReference | null;
  verification: BusinessVerification | null;
}

export interface CategoryOption {
  slug: string;
  name: string;
}

export interface ListingPhoto {
  id: string;
  key: string;
  position: number;
  alt: string;
  customAlt: string | null;
  width: number;
  height: number;
}

export interface ListingEditor {
  id: string;
  version: number;
  slug: string;
  stage: string;
  paused: boolean;
  name: string;
  tagline: string;
  categorySlug: string;
  about: string | null;
  where: string | null;
  hours: string | null;
  website: string | null;
  highlight: string | null;
  categories: CategoryOption[];
  photos: ListingPhoto[];
  recheckRequested: boolean;
}

/** What the owner saves; `version` is the one the editor opened (L2-087 AC8). */
export interface ListingChanges {
  version: number;
  name: string;
  tagline: string;
  category: string;
  about: string;
  where: string;
  hours: string;
  website: string;
  highlight: string;
}

export interface PauseResult {
  paused: boolean;
  pausedAt: string | null;
  state: BusinessState;
  needsReview: boolean;
}

/** The owner's away period after a change: the instant they are back, or none (L2-062). */
export interface AwayPeriod {
  awayUntil: string | null;
}
