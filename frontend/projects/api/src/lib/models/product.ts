import { ProductCard } from './directory';
import { ListingPagePhoto } from './listing';

/** One option of a product; `maxQuantity` bounds the quantity without revealing the stock. */
export interface ProductOption {
  label: string;
  maxQuantity: number;
}

/** `GET /api/listings/{slug}/products/{product}`: the product page (L2-035, L2-036). */
export interface ProductPage {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  perUnit: boolean;
  /** For example "plus $9 shipping, or free pickup". */
  deliveryLine: string | null;
  tile: ProductCard['tile'];
  shop: { slug: string; name: string };
  description: string | null;
  attributes: { label: string; value: string }[];
  /** What the options choose, for example "Size"; null without options. */
  optionName: string | null;
  options: ProductOption[];
  minimumQuantity: number;
  /** The bound before an option is chosen, or of a product without options. */
  maxQuantity: number;
  soldOut: boolean;
  restockNote: string | null;
  more: ProductCard[];
  /** The signed-in member already asked to be told when it is back (L2-036 AC2). */
  stockAlertRequested: boolean;
  /** The product's photo, named by the product; null shows the tile (L2-091 AC10). */
  photo?: ListingPagePhoto | null;
}
