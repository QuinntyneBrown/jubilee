export type OfferKind = 'products' | 'services';

export type ItemPriceKind = 'free' | 'amount' | 'ask';

/** A product or service the owner added while listing (L2-073). */
export interface DraftItem {
  name: string;
  /** A service's short detail. */
  detail: string | null;
  priceKind: ItemPriceKind;
  priceCents: number | null;
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
  church: string;
  pastorEmail: string;
  agreed: boolean;
  updatedAt: string;
  items: DraftItem[];
}

/** What a save or a submit sends: the form, and for a submit the key that makes a repeat safe. */
export interface ListingDraftBody {
  kind: OfferKind;
  name: string;
  tagline: string;
  categorySlug: string | null;
  highlight: string | null;
  place: string | null;
  church: string;
  pastorEmail: string;
  agreed: boolean;
  items: DraftItem[];
  idempotencyKey: string | null;
}

/** `POST /api/listing-drafts/{id}/submit`: the listing now waits on its church reference. */
export interface SubmittedListing {
  listingId: string;
  slug: string;
  name: string;
  kind: OfferKind;
  stage: 'pending-reference';
  church: string;
  pastorEmail: string;
  submittedAt: string;
}
