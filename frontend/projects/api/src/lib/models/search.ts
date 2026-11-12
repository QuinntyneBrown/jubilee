/** Read models of the directory search (L2-029 to L2-032), as the API returns them. */

import type { SpaceCard } from './directory';

export type SearchResultKind = 'business' | 'service' | 'product';

/** A span of the explanation to highlight; the page builds the `<mark>` itself. */
export interface HighlightRange {
  start: number;
  length: number;
}

export interface MatchExplanation {
  text: string;
  highlights: HighlightRange[];
}

export interface SearchHit {
  kind: SearchResultKind;
  name: string;
  /** The slug of the business, whatever the kind of the hit. */
  slug: string;
  productSlug: string | null;
  businessName: string;
  categorySlug: string;
  /** Null when the search ran without its index (L2-181). */
  explanation: MatchExplanation | null;
  /** A space's card, never its address (L2-195); absent for a business. */
  space?: SpaceCard | null;
}

export interface SearchSuggestion {
  closeTerm: string;
  categorySlug: string | null;
}

export interface SearchResults {
  query: string;
  businessCount: number;
  serviceCount: number;
  productCount: number;
  hasMatchExplanations: boolean;
  hits: SearchHit[];
  suggestion: SearchSuggestion | null;
}

export interface RecentSearch {
  id: string;
  query: string;
}

export interface PopularCategory {
  slug: string;
  name: string;
  count: number;
}

/** The empty search page. */
export interface SearchStart {
  recent: RecentSearch[];
  popularCategories: PopularCategory[];
}
