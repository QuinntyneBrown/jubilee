import type { SpaceDraft } from './listing-drafts';

/** The owner's workspace: My business, the listing editor, photos, pause and resume (L2-085 to L2-088, L2-096). */

/** Where the owner's listing stands; nobody verifies it before it is live (ADR 0057). */
export type BusinessState = 'none' | 'draft' | 'live' | 'paused';

export interface BusinessStat {
  value: number;
  change: number;
}

export interface BusinessStats {
  views: BusinessStat;
  openRequests: number;
  newSinceYesterday: number;
  unansweredMessages: number;
  /** The members who saved the business; `change` is how many first did so in the last 7 days (L2-085 AC6). */
  saved: BusinessStat;
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
  /** "Live since Jun 2026": when the owner published the listing (L2-085 AC4). */
  liveSince: string;
}

/** One entry of the switcher on My business (L2-079 AC4): a listing with its stage, or a draft not yet published. */
export interface BusinessOption {
  id: string;
  name: string;
  kind: 'listing' | 'draft';
  /** "Live", "Paused" or "Draft". */
  stageLabel: string;
  /** The listing the workspace shows. */
  current: boolean;
}

export interface MyBusiness {
  state: BusinessState;
  /** The owner's listings, then their drafts; empty for a member who owns nothing. */
  businesses: BusinessOption[];
  listingId: string | null;
  name: string | null;
  slug: string | null;
  tagline: string | null;
  categorySlug: string | null;
  /** The category as members read it, for example "Shops" (L2-086 AC4). */
  categoryName: string | null;
  subtitle: string;
  paused: boolean;
  pausedAt: string | null;
  /** The instant the owner is back, while an away period is set (L2-062). */
  awayUntil?: string | null;
  newRequests: number;
  stats: BusinessStats | null;
  needsReply: NeedsReply[];
  summary: BusinessSummary | null;
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
  /** Where the listing stands, for the workspace header: "Live since June 2026" (L2-097 AC3). */
  subtitle: string;
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
  /** A space's own fields, with its exact address for its owner (L2-209); absent for a business. */
  space?: SpaceDraft | null;
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
  /** The listing the editor opened, so a save after a switch in another tab is refused (ADR 0052). */
  listingId?: string;
  /** A space's own fields (L2-209); omitted for a business. */
  space?: SpaceDraft;
}

export interface PauseResult {
  paused: boolean;
  pausedAt: string | null;
  state: BusinessState;
}

/** The owner's away period after a change: the instant they are back, or none (L2-062). */
export interface AwayPeriod {
  awayUntil: string | null;
}
