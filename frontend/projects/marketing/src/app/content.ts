/**
 * The listings the marketing page shows. They are editorial content taken from the design
 * reference, not read from the directory (ADR 0013); names and taglines are the businesses' own.
 */

/** A business in the glimpse of the app or on a card. */
export interface MarketingBusiness {
  name: string;
  tagline: string;
  /** The label on the photo: "Shop", or the first word of the category. */
  tag: string;
  highlight?: string;
  photo: string;
}

const photo = (id: string): string =>
  `https://cdn.magicpatterns.com/patterns/generated-images/${id}.jpg`;

const PHOTOS = {
  advisor: photo('2543c419-73ef-4324-89de-0fcc4684582d'),
  counselling: photo('3df1f794-f142-4ee8-b356-406160c1b176'),
  flowers: photo('a7c4d0b7-d519-421d-9bb1-27a22e65e44e'),
  law: photo('68a97447-e494-4f8f-a381-457ccf0d5a16'),
  plumbing: photo('bcde9411-0bf6-443b-9dfc-910234bf3c50'),
  roofing: photo('4a975d52-5a0d-4be9-9034-885fce45f098'),
  tshirt: photo('c6570a73-de87-4964-a535-c9a206418db5'),
};

/** The still shown before the pitch film plays. */
export const FILM_STILL = photo('ce88ac23-a3ab-401f-9949-f934eb50034f');

/** The number of verified businesses the page speaks of. */
export const BUSINESS_COUNT = 47;

/** The search results in the glimpse of the app: "Home repairs near Leslieville". */
export const GLIMPSE_RESULTS: readonly MarketingBusiness[] = [
  {
    name: 'WaterWorks Plumbing & Drains',
    tagline: 'Treating Every Customer As Family',
    tag: 'Home',
    photo: PHOTOS.plumbing,
  },
  {
    name: 'Norris Roofing & Contracting',
    tagline: 'Trusted in Ontario for over 25 years',
    tag: 'Home',
    photo: PHOTOS.roofing,
  },
  {
    name: 'Moore’s Cleaning Service',
    tagline: 'Enjoy the Freedom of Clean',
    tag: 'Home',
    photo: PHOTOS.roofing,
  },
  {
    name: 'Tony’s Flooring Centre',
    tagline: 'Family owned and operated since 1961',
    tag: 'Shop',
    photo: PHOTOS.roofing,
  },
];

/** The cards of "Shops and services, side by side."; the first one is the featured card. */
export const INSIDE_CARDS: readonly MarketingBusiness[] = [
  {
    name: 'Legacy Financial',
    tagline: 'Build a Legacy. Protect a Legacy. Leave a Legacy.',
    tag: 'Financial',
    highlight: 'Free first meeting',
    photo: PHOTOS.advisor,
  },
  {
    name: 'Flower Creations',
    tagline: 'Fresh Blooms for Every Occasion',
    tag: 'Shop',
    highlight: 'Same-day delivery',
    photo: PHOTOS.flowers,
  },
  {
    name: 'Adrianne Sequeira, DMin., RP, RMFT, RN',
    tagline: 'Expert therapy and counselling for individuals, couples, and families',
    tag: 'Health',
    highlight: 'Accepting new clients',
    photo: PHOTOS.counselling,
  },
  {
    name: 'Luzandre.com',
    tagline: 'Unique & custom Christian apparel, artworks & gifts that bring joy',
    tag: 'Shop',
    highlight: 'Ships across Canada',
    photo: PHOTOS.tshirt,
  },
  {
    name: 'Kevin Marshall, Barrister & Solicitor',
    tagline: 'Caring for you, so you can take care of what matters',
    tag: 'Legal',
    highlight: 'Book a consultation',
    photo: PHOTOS.law,
  },
];
