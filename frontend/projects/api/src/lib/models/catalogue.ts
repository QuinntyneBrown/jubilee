/** The owner's products and services (L2-089 to L2-095). */

export interface OwnerProductOption {
  label: string;
  stock: number | null;
}

/** A product photo the owner uploaded: its id for the save, its key and size for the tile (L2-091 AC9). */
export interface ProductPhoto {
  id: string;
  key: string;
  width: number;
  height: number;
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
  /** What the save that returned this row did to the stock; a listed row says `none` (L2-036 AC3). */
  stockChange: 'none' | 'became-sold-out' | 'back-in-stock';
  /** The product's photo, or null: its tile shows instead (L2-091 AC10). */
  photo: ProductPhoto | null;
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
  /** The uploaded photo the product shows; null shows none (ADR 0062). */
  photoId?: string | null;
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
  /** When meetings can be booked (L2-220). */
  meetingHours: MeetingHours;
}

/** What the owner sets about meeting hours (L2-220): days of the week (0 is Sunday) and Toronto times as `HH:mm`. */
export interface MeetingHoursInput {
  days: number[];
  opensAt: string;
  closesAt: string;
  slotMinutes: number;
}

/** The meeting hours in force: the owner's, or the ones proposed while `ownerSet` is false. */
export interface MeetingHours extends MeetingHoursInput {
  /** The days in words, such as "Monday to Friday". */
  meetsOn: string;
  ownerSet: boolean;
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
