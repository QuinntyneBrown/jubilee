/** Where a published listing stands, as the API names it (L2-099 AC2, L2-100 AC5). */
export type AdminListingStatus = 'live' | 'paused' | 'on-hold' | 'taken-down';

/** One row of `GET /api/admin/listings` (L2-099). */
export interface AdminListingRow {
  id: string;
  name: string;
  categoryName: string;
  ownerName: string;
  publishedAt: string;
  status: AdminListingStatus;
  statusLabel: string;
  /** The listing carries a flag of L2-072 AC6. */
  flagged: boolean;
}

/** The answer of `GET /api/admin/listings`: every published listing, newest first (L2-099). */
export interface AdminListings {
  total: number;
  publishedThisWeek: number;
  rows: AdminListingRow[];
}

export interface AdminListingOwner {
  name: string;
  email: string;
  emailConfirmed: boolean;
  memberSince: string;
  /** The owner's other listings, then their drafts, each with its stage (L2-079 AC3). */
  otherListings: { name: string; stageLabel: string }[];
}

/** When the Jubilee team took a listing down, who did and why (L2-100 AC5). */
export interface AdminTakedown {
  at: string;
  byName: string;
  reason: string;
}

/** What the team reads of a space: every field but its exact address (L2-200 AC3). */
export interface AdminListingSpace {
  term: 'short-stay' | 'long-term' | 'room' | 'roommate';
  rent: number;
  per: 'night' | 'month';
  available: string;
  minimumStayLabel: string;
  neighbourhood: string;
  place: string;
  facts: string[];
  included: string[];
  household: string | null;
  rules: string[];
}

/** The answer of `GET /api/admin/listings/:id` and of the takedown (L2-100, L2-101). */
export interface AdminListing {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  about: string | null;
  kind: string;
  categorySlug: string;
  categoryName: string;
  publishedAt: string | null;
  status: AdminListingStatus;
  statusLabel: string;
  owner: AdminListingOwner;
  flags: string[];
  isOwnListing: boolean;
  takenDown: AdminTakedown | null;
  /** A space's details; null for a business (L2-200 AC3). */
  space?: AdminListingSpace | null;
}

/** What each flag of L2-072 AC6 asks the team to check. */
export const FLAG_TEXT: Record<string, string> = {
  CONTACT_IN_TEXT:
    'The name or tagline contains a web address, e-mail address, phone number or discount code. Check that it belongs to this business.',
};
