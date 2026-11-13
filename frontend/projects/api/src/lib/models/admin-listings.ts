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
  /** The owner's pronouns, for the team's words about them (L2-013 AC8); null when none were set. */
  pronouns?: string | null;
}

/** When the Jubilee team took a listing down, who did and why (L2-100 AC5). */
export interface AdminTakedown {
  at: string;
  byName: string;
  reason: string;
}

/**
 * What the team reads of a software platform (L2-257 AC2): the address as its founder typed it,
 * the same address as a link only when it is an https address, and the founder's words.
 */
export interface AdminListingPlatform {
  address: string;
  /** The address to link to; null when the stored address fails the rule, and nothing links. */
  website: string | null;
  does: string;
  for: string;
  pricing: string;
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
  /** A platform's address and words; null for every other listing (L2-257 AC2). */
  platform?: AdminListingPlatform | null;
  /** The green line of the listing's card, when it has one. */
  highlight?: string | null;
}

/** What each flag of L2-072 AC6 asks the team to check. */
export const FLAG_TEXT: Record<string, string> = {
  CONTACT_IN_TEXT:
    'The name or tagline contains a web address, e-mail address, phone number or discount code. Check that it belongs to this business.',
};
