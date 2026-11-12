import { IconName } from '../icon/icons';

export type TileTint = 'ink' | 'gold' | 'green' | 'blue';

/** The tinted icon tile that stands in for a photo. */
export interface CategoryTile {
  tint: TileTint;
  icon: IconName;
  /** The short category label on the tile ("Financial" for "Financial & insurance"). */
  label: string;
}

/** CategoryTileMap: the tile of each of the ten categories (ADR 0004). */
const TILES: Readonly<Record<string, CategoryTile>> = {
  shops: { tint: 'gold', icon: 'bag', label: 'Shop' },
  'financial-insurance': { tint: 'green', icon: 'chart', label: 'Financial' },
  'legal-immigration': { tint: 'blue', icon: 'shield', label: 'Legal' },
  'home-property': { tint: 'ink', icon: 'wrench', label: 'Home' },
  'real-estate-living': { tint: 'gold', icon: 'home', label: 'Real estate' },
  'health-family': { tint: 'green', icon: 'heart', label: 'Health' },
  'business-tech': { tint: 'blue', icon: 'briefcase', label: 'Business' },
  learning: { tint: 'blue', icon: 'book', label: 'Learning' },
  media: { tint: 'ink', icon: 'image', label: 'Media' },
  community: { tint: 'green', icon: 'user', label: 'Community' },
  'rooms-rentals': { tint: 'blue', icon: 'bed', label: 'Rooms' },
};

const FALLBACK: CategoryTile = { tint: 'ink', icon: 'store', label: '' };

export function categoryTile(categorySlug: string): CategoryTile {
  return TILES[categorySlug] ?? FALLBACK;
}
