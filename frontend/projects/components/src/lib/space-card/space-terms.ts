import type { IconName } from '../icon/icons';
import type { TileTint } from '../media-tile/category-tile';

/** How a space is rented (L2-196), as the API writes it. */
export type SpaceTermValue = 'short-stay' | 'long-term' | 'room' | 'roommate';

/** The four terms in their fixed order. */
export const SPACE_TERMS: readonly SpaceTermValue[] = [
  'short-stay',
  'long-term',
  'room',
  'roommate',
];

/** The badge on a space card (L2-202 AC1). */
export const TERM_BADGES: Readonly<Record<SpaceTermValue, string>> = {
  'short-stay': 'Short stay',
  'long-term': 'Long term',
  room: 'Room',
  roommate: 'Roommate wanted',
};

/** The choices of the term filter (L2-200 AC2). */
export const TERM_FILTER_LABELS: Readonly<Record<SpaceTermValue, string>> = {
  'short-stay': 'Short stays',
  'long-term': 'Long term',
  room: 'Rooms',
  roommate: 'Roommates',
};

/** The tile that stands in for a space's photo, by term. */
export const TERM_TILES: Readonly<Record<SpaceTermValue, { tint: TileTint; icon: IconName }>> = {
  'short-stay': { tint: 'blue', icon: 'bed' },
  'long-term': { tint: 'ink', icon: 'key' },
  room: { tint: 'gold', icon: 'bed' },
  roommate: { tint: 'green', icon: 'home' },
};

/** Whether a term is rented by the night. */
export function isNightly(term: SpaceTermValue): boolean {
  return term === 'short-stay';
}

/**
 * What a card says of when a space is free (L2-202 AC1): "Available now" for "Now", "From Dec 1"
 * for a monthly term, and a Short stay's own words ("Most weekends").
 */
export function availability(term: SpaceTermValue, available: string): string {
  if (available.trim().toLowerCase() === 'now') return 'Available now';
  return isNightly(term) ? available : `From ${available}`;
}

/** A rent in whole dollars: 1850 → "$1,850". */
export function formatRent(dollars: number): string {
  return `$${new Intl.NumberFormat('en-CA').format(dollars)}`;
}
