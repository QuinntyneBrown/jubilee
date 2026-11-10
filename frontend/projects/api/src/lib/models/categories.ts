import { CategoryLink } from './directory';

/**
 * The ten categories, in their fixed order (L2-023). They never change at run time, so pages
 * can render the category links before any request has answered.
 */
export const CATEGORIES: readonly CategoryLink[] = [
  { slug: 'shops', name: 'Shops' },
  { slug: 'financial-insurance', name: 'Financial & insurance' },
  { slug: 'legal-immigration', name: 'Legal & immigration' },
  { slug: 'home-property', name: 'Home & property' },
  { slug: 'real-estate-living', name: 'Real estate & living' },
  { slug: 'health-family', name: 'Health & family' },
  { slug: 'business-tech', name: 'Business & tech' },
  { slug: 'learning', name: 'Learning' },
  { slug: 'media', name: 'Media' },
  { slug: 'community', name: 'Community' },
];
