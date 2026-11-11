import type { ProductCard } from './directory';

export interface BookingService {
  id: string;
  name: string;
  detail: string;
  priceKind: 'free' | 'amount' | 'ask';
  priceCents: number | null;
}

/** `GET /api/listings/{slug}/booking`: what the booking dialog needs to open. */
export interface BookingOptions {
  business: { name: string; slug: string };
  ownerFirstName: string;
  /** For example "Monday to Friday". */
  meetsOn: string;
  /** Days of the week the business meets, 0 for Sunday. */
  meetingDays: number[];
  area: string | null;
  /** For example "within a day"; null with too few replies. */
  usuallyConfirms: string | null;
  maxDaysAhead: number;
  services: BookingService[];
}

/** `GET /api/listings/{slug}/availability`: the times of one day. */
export interface Availability {
  day: string;
  available: boolean;
  /** Start times as "HH:mm" in Toronto time. */
  slots: string[];
}

export type MeetingMode = 'video' | 'in-person';

export interface BookMeetingRequest {
  listingSlug: string;
  serviceId: string;
  day: string | null;
  time: string | null;
  mode: MeetingMode;
  note: string | null;
  idempotencyKey: string;
}

export interface BookedRequest {
  id: string;
  status: string;
  memberStatus: string;
}

/** `GET /api/listings/{slug}/quote`: what the quote dialog needs to open. */
export interface QuoteOptions {
  business: { name: string; slug: string };
  ownerFirstName: string;
  /** For example "within a few hours"; null with too few replies. */
  usuallyReplies: string | null;
}

export interface RequestQuoteRequest {
  listingSlug: string;
  serviceId: string | null;
  description: string;
  neededBy: string | null;
  budget: string | null;
  phone: string | null;
  idempotencyKey: string;
}

export interface OrderOption {
  label: string;
  maxQuantity: number;
}

export interface DeliveryMethod {
  id: string;
  kind: 'ship' | 'pickup';
  label: string;
  /** For example "Canada Post, $9 flat · 3–6 business days". */
  detail: string;
  feeCents: number;
}

/** `GET /api/listings/{slug}/products/{product}/order`: what the order dialog needs to open. */
export interface OrderOptions {
  shop: { name: string; slug: string };
  ownerFirstName: string;
  usuallyReplies: string | null;
  /** For example "Made to order: ready in 5–7 days."; null when the shop gives none. */
  leadTime: string | null;
  product: {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    perUnit: boolean;
    optionName: string | null;
    options: OrderOption[];
    minimumQuantity: number;
    maxQuantity: number;
    tile: ProductCard['tile'];
  };
  deliveryMethods: DeliveryMethod[];
  freeShippingOverCents: number | null;
  lastShippingAddress: string | null;
}

/** The body of an order request: no price, shipping or total; the server computes them. */
export interface RequestItemRequest {
  listingSlug: string;
  productSlug: string;
  option: string | null;
  quantity: number;
  deliveryMethodId: string;
  shippingAddress: string | null;
  note: string | null;
  idempotencyKey: string;
}
