/** The owner's products and services (L2-089 to L2-095). */

export interface OwnerProductOption {
  label: string;
  stock: number | null;
}

export interface OwnerProduct {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  perUnit: boolean;
  stock: number | null;
  soldOut: boolean;
  description: string | null;
  tint: string;
  icon: string;
  minimumQuantity: number;
  optionName: string | null;
  options: OwnerProductOption[];
  /** Orders asked for it, all time. */
  requests: number;
}

export interface OwnerProducts {
  business: string;
  slug: string;
  subtitle: string;
  live: boolean;
  total: number;
  soldOut: number;
  max: number;
  rows: OwnerProduct[];
}

/** What the owner types in the product editor; the price stays text until the server reads it (L2-091 AC3). */
export interface ProductInput {
  name: string;
  price: string;
  stock: number | null;
  description: string;
  minimumQuantity?: number | null;
  optionName?: string | null;
  options?: OwnerProductOption[] | null;
  idempotencyKey: string;
}

export type ServicePricing = 'free' | 'amount' | 'ask';

export interface OwnerService {
  id: string;
  name: string;
  detail: string;
  priceKind: ServicePricing;
  priceCents: number | null;
  action: 'book' | 'ask';
  durationMinutes: number | null;
  offersVideo: boolean;
  offersInPerson: boolean;
  inPersonPlace: string | null;
}

export interface OwnerServices {
  business: string;
  slug: string;
  subtitle: string;
  live: boolean;
  total: number;
  max: number;
  rows: OwnerService[];
}

export interface ServiceInput {
  name: string;
  detail: string;
  pricing: ServicePricing;
  price: string;
  action: 'book' | 'ask';
  durationMinutes: number | null;
  offersVideo: boolean;
  offersInPerson: boolean;
  place: string;
  idempotencyKey: string;
}

export interface DeletedItem {
  id: string;
  name: string;
  pastRequests: number;
}
