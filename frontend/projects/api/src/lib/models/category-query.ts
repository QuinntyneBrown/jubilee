import { AreaServed, CategoryQuery, ListingSort, OfferFilter, SpaceTerm } from './directory';

/** The allowed filter values with the words the page shows for them. */
export const OFFERS: readonly { value: OfferFilter; label: string }[] = [
  { value: 'free-quote', label: 'Free quote' },
  { value: 'emergency-calls', label: 'Emergency calls' },
  { value: 'open-saturdays', label: 'Open Saturdays' },
];

export const AREAS: readonly { value: AreaServed; label: string }[] = [
  { value: 'scarborough', label: 'Scarborough' },
  { value: 'north-york', label: 'North York' },
  { value: 'east-york', label: 'East York' },
  { value: 'etobicoke', label: 'Etobicoke' },
  { value: 'downtown', label: 'Downtown' },
];

export const SORTS: readonly { value: ListingSort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
];

/** The terms a space is rented on, in their fixed order (L2-197). */
export const SPACE_TERM_VALUES: readonly SpaceTerm[] = [
  'short-stay',
  'long-term',
  'room',
  'roommate',
];

export const DEFAULT_QUERY: CategoryQuery = {
  offers: [],
  areas: [],
  sort: 'recommended',
  page: 1,
  term: null,
};

function list<T extends string>(raw: string | null, allowed: readonly { value: T }[]): T[] {
  const values = (raw ?? '').split(',').map((value) => value.trim().toLowerCase());
  const known = values.filter((value): value is T => allowed.some((a) => a.value === value));
  return [...new Set(known)];
}

/**
 * Reads a category query from query-string parameters. The query string is untrusted: values
 * outside the allowed sets are dropped (L2-024), and the server does the same.
 */
export function parseCategoryQuery(params: { get(name: string): string | null }): CategoryQuery {
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  const term = params.get('term')?.trim().toLowerCase() ?? null;
  return {
    offers: list(params.get('offers'), OFFERS),
    areas: list(params.get('areas'), AREAS),
    sort: SORTS.some((s) => s.value === sort) ? (sort as ListingSort) : 'recommended',
    page: Number.isInteger(page) && page > 1 ? page : 1,
    // An unknown term is ignored (L2-202 AC2).
    term: SPACE_TERM_VALUES.find((value) => value === term) ?? null,
  };
}

/** The query-string parameters of a category query; defaults are left out of the URL. */
export function categoryQueryParams(query: CategoryQuery): Record<string, string> {
  const params: Record<string, string> = {};
  if (query.offers.length) params['offers'] = query.offers.join(',');
  if (query.areas.length) params['areas'] = query.areas.join(',');
  if (query.sort !== 'recommended') params['sort'] = query.sort;
  if (query.page > 1) params['page'] = `${query.page}`;
  if (query.term) params['term'] = query.term;
  return params;
}
