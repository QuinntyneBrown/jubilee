/** Read models of the public directory, as the API returns them. */

export interface CategoryLink {
  slug: string;
  name: string;
}

/** A business as the large card shows it. */
export interface BusinessCard {
  slug: string;
  name: string;
  tagline: string;
  highlight: string | null;
  categorySlug: string;
  verified: boolean;
  coverPhoto: null;
}

/** A business as the one-line directory row shows it. */
export interface DirectoryRow {
  slug: string;
  name: string;
  tagline: string;
  verified: boolean;
}

export type TileTint = 'ink' | 'gold' | 'green' | 'blue';
export type ProductTileIcon = 'shirt' | 'mug' | 'book' | 'bag';

export interface ProductCard {
  slug: string;
  businessSlug: string;
  name: string;
  shopName: string;
  priceCents: number;
  perUnit: boolean;
  /** Stands in for the product photo until uploads exist. */
  tile: { tint: TileTint; icon: ProductTileIcon };
}

/** How a space is rented (L2-197). */
export type SpaceTerm = 'short-stay' | 'long-term' | 'room' | 'roommate';

/** A space as its card shows it (L2-203). It never carries an exact address. */
export interface SpaceCard {
  slug: string;
  name: string;
  term: SpaceTerm;
  rent: number;
  per: 'night' | 'month';
  /** Up to two key facts. */
  facts: string[];
  neighbourhood: string;
  available: string;
  coverPhoto: string | null;
}

/** "Rooms & places to stay" on Browse (L2-201): the newest spaces overall and per term. */
export interface RoomsShelf {
  /** Live spaces in all. */
  count: number;
  spaces: SpaceCard[];
}

export interface CategoryGroup {
  slug: string;
  name: string;
  count: number;
  hasMore: boolean;
  businesses: DirectoryRow[];
}

/** `GET /api/directory/welcome` */
export interface Welcome {
  liveBusinessCount: number;
  categories: CategoryLink[];
  featured: BusinessCard[];
}

/** `GET /api/directory/home` */
export interface BrowseHome {
  liveBusinessCount: number;
  categories: CategoryLink[];
  featured: BusinessCard[];
  products: ProductCard[];
  groups: CategoryGroup[];
  rooms: RoomsShelf;
}

export type OfferFilter = 'free-quote' | 'emergency-calls' | 'open-saturdays';
export type AreaServed = 'scarborough' | 'north-york' | 'east-york' | 'etobicoke' | 'downtown';
export type ListingSort = 'recommended' | 'newest' | 'name';

/** The filters of a category query. Within a group any value matches; across groups all must. */
export interface CategoryFilters {
  offers: OfferFilter[];
  areas: AreaServed[];
}

/** The filters, sort order and page that the query string of a category page carries. */
export interface CategoryQuery extends CategoryFilters {
  sort: ListingSort;
  page: number;
  /** Rooms & rentals only: the term chosen, or null for any length (L2-202 AC2). */
  term: SpaceTerm | null;
}

/** How many businesses would match if one applied filter were removed. */
export type FilterSuggestion =
  | { removed: { group: 'offers'; value: OfferFilter }; count: number }
  | { removed: { group: 'areas'; value: AreaServed }; count: number };

/** `GET /api/categories/{slug}/listings` */
export interface CategoryPage {
  category: CategoryLink;
  /** Public listings in the category, ignoring the filters. */
  totalCount: number;
  /** Public listings that match the filters. */
  matchCount: number;
  fact: { offer: OfferFilter; count: number } | null;
  filters: CategoryFilters;
  sort: ListingSort;
  page: number;
  pageSize: number;
  pageCount: number;
  businesses: BusinessCard[];
  suggestions: FilterSuggestion[];
  /** Rooms & rentals only: the term applied, or null. */
  term: SpaceTerm | null;
  /** Rooms & rentals only: its spaces, newest first; empty for any other category. */
  spaces: SpaceCard[];
}
