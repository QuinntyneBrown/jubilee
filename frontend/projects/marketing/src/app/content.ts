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

/** The photos live in docs/assets/photos; `npm run media:sync` copies them into the site. */
const photo = (name: string): string => `photos/${name}.jpg`;

const PHOTOS = {
  advisor: photo('advisor'),
  counselling: photo('counselling'),
  flowers: photo('flowers'),
  law: photo('law'),
  plumbing: photo('plumbing'),
  roofing: photo('roofing'),
  tshirt: photo('tshirt'),
};

/** The still shown before the pitch film plays. */
/**
 * The pitch film (L2-184). Its narration is burned into the picture as captions (AC5), so it
 * has no caption track. The chapters are its acts: the hook, why join and what you can do, then
 * listing a business.
 */
export const FILM = {
  src: 'media/jubilee-pitch.mp4',
  still: photo('film-still'),
  length: '1:04',
  chapters: [
    { at: 0, time: '0:00', title: 'Why we built Jubilee' },
    { at: 21.6, time: '0:21', title: 'Finding someone you can trust' },
    { at: 43.2, time: '0:43', title: 'Growing your business' },
  ],
} as const;

/** Jubilee's mission, the single level-0 requirement (L0-001, docs/specs/L0.md), word for word. */
export const MISSION =
  'Abiding in Jesus and for love of Him, Jubilee equips Christian business people in Toronto to prosper with purpose and resource His Kingdom.';

/** The number of verified businesses the page speaks of. */
export const BUSINESS_COUNT = 47;

const GLIMPSE_RESULTS: readonly MarketingBusiness[] = [
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

/** The glimpse of the app beside the opening: a search and the four businesses it found. */
export const GLIMPSE = {
  search: 'Home repairs near Leslieville',
  caption: 'Home & property · 11 verified',
  results: GLIMPSE_RESULTS,
} as const;

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
