import { CategoryLink } from './directory';

/** A category with the words its page uses before, or without, any listing. */
export interface Category extends CategoryLink {
  /** Shown under the heading when the category could not be loaded. */
  blurb: string;
  /** Completes "Know a Christian … in Toronto?" on an empty category. */
  trades: string;
}

/**
 * The twelve categories, in their fixed order (L2-023). "Rooms & rentals" lists spaces, not
 * businesses (L2-197), and "Software platforms" lists platforms (L2-248). They never change at run time, so pages
 * can render the category links before any request has answered.
 */
export const CATEGORIES: readonly Category[] = [
  {
    slug: 'shops',
    name: 'Shops',
    blurb: 'Bookshops, apparel, gifts and more.',
    trades: 'bookseller, maker or shopkeeper',
  },
  {
    slug: 'rooms-rentals',
    name: 'Rooms & rentals',
    blurb: 'Rooms, suites and places to stay from people you can trust.',
    trades: 'host with a room, suite or hall',
  },
  {
    slug: 'financial-insurance',
    name: 'Financial & insurance',
    blurb: 'Advisors, planners, brokers and more.',
    trades: 'advisor, planner or broker',
  },
  {
    slug: 'legal-immigration',
    name: 'Legal & immigration',
    blurb: 'Lawyers, notaries, immigration consultants and more.',
    trades: 'lawyer, notary or immigration consultant',
  },
  {
    slug: 'home-property',
    name: 'Home & property',
    blurb: 'Plumbers, builders, cleaners and more.',
    trades: 'plumber, builder or cleaner',
  },
  {
    slug: 'real-estate-living',
    name: 'Real estate & living',
    blurb: 'Realtors, communities, movers and more.',
    trades: 'realtor, property manager or mover',
  },
  {
    slug: 'health-family',
    name: 'Health & family',
    blurb: 'Counsellors, dentists, childcare and more.',
    trades: 'counsellor, dentist or childcare provider',
  },
  {
    slug: 'business-tech',
    name: 'Business & tech',
    blurb: 'Consultants, IT services, logistics and more.',
    trades: 'consultant, developer or bookkeeper',
  },
  {
    slug: 'learning',
    name: 'Learning',
    blurb: 'Tutors, music teachers, training and more.',
    trades: 'tutor, music teacher or trainer',
  },
  {
    slug: 'media',
    name: 'Media',
    blurb: 'Radio, television, photographers and more.',
    trades: 'broadcaster, photographer or designer',
  },
  {
    slug: 'community',
    name: 'Community',
    blurb: 'Ministries, charities, events and more.',
    trades: 'ministry, charity or event organiser',
  },
  {
    slug: 'software-platforms',
    name: 'Software platforms',
    blurb: 'Apps and online tools built by Christian founders in Toronto.',
    trades: 'founder',
  },
];
