import type { SpaceTerm } from './directory';

export type OfferKind = 'products' | 'services' | 'space';

export type ItemPriceKind = 'free' | 'amount' | 'ask';

/** A product or service the owner added while listing (L2-073). */
/**
 * A product or a service of a draft, with what its editor asks (L2-073). The fields of the other
 * kind keep their defaults: a product is asked about and a service has no stock.
 */
export interface DraftItem {
  name: string;
  /** A service's short detail. */
  detail: string | null;
  priceKind: ItemPriceKind;
  priceCents: number | null;
  /** A product's description. */
  description: string | null;
  /** A product's stock; null is not tracked. */
  stock: number | null;
  /** What members can do with a service (L2-094). */
  action: 'book' | 'ask';
  /** The length of a meeting, for a service members can book. */
  durationMinutes: number | null;
  offersVideo: boolean;
  offersInPerson: boolean;
  inPersonPlace: string | null;
}

/**
 * The rental fields of a space (L2-199). The exact address goes only to the owner and, once
 * they accept, to that renter (L2-208).
 */
export interface SpaceDraft {
  term: SpaceTerm;
  /** Whole dollars per night or per month; null until given. */
  rent: number | null;
  available: string;
  /** Nights for a Short stay, months otherwise. */
  minimumStay: number;
  neighbourhood: string;
  address: string;
  place: string;
  facts: string[];
  included: string[];
  household: string | null;
  rules: string[];
}

/** The listing form as saved on the server (L2-077). */
export interface ListingDraft {
  id: string;
  kind: OfferKind;
  name: string;
  tagline: string;
  categorySlug: string | null;
  highlight: string | null;
  /** A shop's store address, or the area a service business serves. */
  place: string | null;
  agreed: boolean;
  updatedAt: string;
  items: DraftItem[];
  /** The rental fields; null unless the draft is a space. */
  space?: SpaceDraft | null;
}

/** What a save or a submit sends: the form, and for a submit the key that makes a repeat safe. */
export interface ListingDraftBody {
  kind: OfferKind;
  name: string;
  tagline: string;
  categorySlug: string | null;
  highlight: string | null;
  place: string | null;
  agreed: boolean;
  items: DraftItem[];
  space: SpaceDraft | null;
  idempotencyKey: string | null;
}

/** `POST /api/listing-drafts/{id}/publish`: the listing is live straight away (L2-078, ADR 0057). */
export interface PublishedListing {
  listingId: string;
  slug: string;
  name: string;
  kind: OfferKind;
  stage: 'live';
  submittedAt: string;
}
