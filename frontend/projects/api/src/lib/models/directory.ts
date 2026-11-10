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
}
