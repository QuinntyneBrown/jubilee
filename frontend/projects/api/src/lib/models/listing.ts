import { BusinessCard, CategoryLink, ProductCard, SpaceCard, SpaceTerm } from './directory';

/** Main offer of a listing; it picks the layout of the listing page. */
export type ListingKind = 'services' | 'shop' | 'space';

/** The caller's relation to the listing, decided by the server from the session. */
export type ViewerRelation = 'visitor' | 'member' | 'owner' | 'moderator';

/** The "Replies" band; null when there are too few replies to say (L2-033 AC5). */
export type ReplyTimeBand = 'few-hours' | 'day' | 'few-days';

/** One row of "Services" or "Custom work" (L2-033 AC2). */
export interface ServiceRow {
  id: string;
  name: string;
  detail: string;
  priceKind: 'free' | 'amount' | 'ask';
  priceCents: number | null;
  /** What the row's action opens: the booking or the quote request. */
  action: 'book' | 'ask';
}

/** The "Details" list; a value the owner has not given is null and its row is left out. */
export interface ListingDetails {
  where: string | null;
  hours: string | null;
  languages: string | null;
  delivery: string | null;
  madeToOrder: string | null;
  /** ISO date-time the listing was created; the page shows its month. */
  onJubileeSince: string;
  replies: ReplyTimeBand | null;
}

/**
 * The rental details of a space (L2-205). The page never carries the exact address, whoever asks
 * (L2-208 AC1).
 */
export interface SpaceDetails {
  term: SpaceTerm;
  /** Whole dollars, per night or per month. */
  rent: number;
  per: 'night' | 'month';
  available: string;
  minimumStay: number;
  /** "2 nights", "12-month lease"; empty when there is no minimum. */
  minimumStayLabel: string;
  neighbourhood: string;
  place: string;
  facts: string[];
  included: string[];
  household: string | null;
  rules: string[];
  /** "Request to book", "Request a viewing" or "Meet the household" (L2-206 AC1). */
  callToAction: string;
}

/**
 * Where a listing stands for the public (L2-219): `live`, or why its page is a preview that only
 * its owner and the Jubilee team can open.
 */
export type ListingStatus = 'live' | 'draft' | 'paused' | 'on-hold';

/** One photo of a listing on its public page (L2-221): the key of its renditions under `/media`. */
export interface ListingPagePhoto {
  key: string;
  alt: string;
  /** The size of the uploaded original; no rendition is wider. */
  width: number;
  height: number;
}

/** `GET /api/listings/{slug}`: the listing page of one business (L2-033, L2-034). */
export interface ListingPage {
  slug: string;
  /** The listing's address, `https://{slug}.jubilee.to`; null where no address domain is set (L2-244). */
  address?: string | null;
  kind: ListingKind;
  name: string;
  category: CategoryLink;
  stage: string;
  status: ListingStatus;
  viewerRelation: ViewerRelation;
  ownerName: string | null;
  tagline: string;
  credentials: string[];
  highlight: string | null;
  about: string | null;
  coverPhoto: null;
  /** The owner's photos in their order, the cover first; empty when there are none (L2-221). */
  photos: ListingPagePhoto[];
  details: ListingDetails;
  services: ServiceRow[];
  /** Every product of the shop; at most 50 are listed. */
  productCount: number;
  products: ProductCard[];
  related: BusinessCard[];
  /** The rental details; null unless the listing is a space. */
  space: SpaceDetails | null;
  /** "More rooms & rentals" on the page of a space. */
  relatedSpaces: SpaceCard[];
  /** The member's open request on this space, when they have one (L2-206). */
  openRequestId?: string | null;
  /** The business carries the "Replies fast" badge (L2-054); never a space. */
  repliesFast: boolean;
}
