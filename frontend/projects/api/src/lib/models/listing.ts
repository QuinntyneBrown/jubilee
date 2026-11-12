import { BusinessCard, CategoryLink, ProductCard, SpaceCard, SpaceTerm } from './directory';

/** Main offer of a listing; it picks the layout of the listing page. */
export type ListingKind = 'services' | 'shop' | 'space';

/** The caller's relation to the listing, decided by the server from the session. */
export type ViewerRelation = 'visitor' | 'member' | 'owner' | 'verifier';

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
 * The rental details of a space (L2-196). The page never carries the exact address, whoever asks
 * (L2-199 AC1).
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
  /** "Request to book", "Request a viewing" or "Meet the household" (L2-197 AC1). */
  callToAction: string;
}

/** `GET /api/listings/{slug}`: the listing page of one business (L2-033, L2-034). */
export interface ListingPage {
  slug: string;
  kind: ListingKind;
  name: string;
  category: CategoryLink;
  verified: boolean;
  stage: string;
  viewerRelation: ViewerRelation;
  ownerName: string | null;
  tagline: string;
  credentials: string[];
  highlight: string | null;
  about: string | null;
  coverPhoto: null;
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
  /** The member's open request on this space, when they have one (L2-197). */
  openRequestId?: string | null;
}
