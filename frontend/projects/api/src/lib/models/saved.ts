import { BusinessCard, ProductCard } from './directory';

/** One saved business or product. An unavailable one has no card and cannot be opened (L2-042 AC3). */
export interface SavedItem {
  id: string;
  kind: 'business' | 'product';
  name: string;
  savedAt: string;
  available: boolean;
  business: BusinessCard | null;
  product: ProductCard | null;
}

/** The answer of `GET /api/saved`: newest first, with the counts of the items that can be opened. */
export interface SavedList {
  businessCount: number;
  productCount: number;
  items: SavedItem[];
}
