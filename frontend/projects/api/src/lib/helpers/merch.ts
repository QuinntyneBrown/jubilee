import { BagLine, Delivery, MerchProduct, MerchSize } from '../models/merch';

/** The most of one size in one checkout (L2-265 AC1). */
export const MAX_QUANTITY = 10;

/** "$59.00". */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "$25" for whole dollars, else "$25.50": the price on the page and on "Add to bag". */
export function price(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : money(cents);
}

/** The most of a size that can be chosen: the lower of 10 and what is left. */
export function maxQuantity(size: Pick<MerchSize, 'left'> | null | undefined): number {
  return Math.max(1, Math.min(MAX_QUANTITY, size?.left ?? MAX_QUANTITY));
}

/** What a delivery costs for shirts that come to `subtotal` (L2-266 AC3). */
export function shippingCents(
  product: Pick<MerchProduct, 'shippingCents' | 'freeShippingFromCents'>,
  subtotal: number,
  delivery: Delivery,
): number {
  return delivery === 'pickup' || subtotal >= product.freeShippingFromCents
    ? 0
    : product.shippingCents;
}

/** "Men’s L and Women’s M", "2 × Men’s L" (L2-269 AC2). */
export function orderSummary(
  lines: readonly { fit: string; size: string; quantity: number }[],
): string {
  const parts = lines.map((l) =>
    l.quantity > 1 ? `${l.quantity} × ${l.fit} ${l.size}` : `${l.fit} ${l.size}`,
  );
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** The number of shirts in some lines. */
export function shirtCount(lines: readonly Pick<BagLine, 'quantity'>[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
