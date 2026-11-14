/** One size of a fit of Jubilee merchandise (L2-263 AC4). `left` is null when its stock is not counted. */
export interface MerchSize {
  readonly sku: string;
  readonly label: string;
  readonly ages: string | null;
  readonly chest: number;
  readonly length: number;
  readonly left: number | null;
}

export type MerchFitKey = 'youth' | 'womens' | 'mens';

export interface MerchFit {
  readonly key: MerchFitKey;
  readonly name: string;
  readonly note: string;
  readonly guideNote: string;
  readonly sizes: readonly MerchSize[];
}

/** The Purpose Tee as anyone reads it: every amount in cents, from the server (L2-263 AC5). */
export interface MerchProduct {
  readonly name: string;
  readonly colour: string;
  readonly unitPriceCents: number;
  readonly currency: string;
  readonly shippingCents: number;
  readonly freeShippingFromCents: number;
  readonly fits: readonly MerchFit[];
}

export type Delivery = 'ship' | 'pickup';

/** One line of a checkout: the price the buyer saw, only so the server can refuse it when it changed. */
export interface CheckoutLine {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
}

export interface CheckoutRequest {
  readonly lines: readonly CheckoutLine[];
  readonly delivery: Delivery;
}

/** The address of the provider's hosted checkout page (L2-267 AC1). */
export interface CheckoutStarted {
  readonly url: string;
}

export interface MerchOrderLine {
  readonly fit: string;
  readonly size: string;
  readonly quantity: number;
}

/** What the return page reads of an order: nothing of the buyer (L2-269 AC7). */
export interface MerchOrder {
  readonly number: string;
  readonly status: 'pending' | 'paid' | 'expired';
  readonly delivery: Delivery;
  readonly lines: readonly MerchOrderLine[];
  readonly totalCents: number;
}

/** A line of the bag kept on the device (L2-266 AC4). */
export interface BagLine {
  readonly sku: string;
  /** The fit's name, "Men’s". */
  readonly fit: string;
  readonly size: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
}
