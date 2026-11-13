/**
 * The eleven categories of businesses, in their fixed order: the groups of the directory (L2-023 AC5).
 * "Software platforms" is the last (L2-248 AC2); its platforms count among the businesses (L2-252 AC1).
 */
export const categories = [
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
  { slug: 'software-platforms', name: 'Software platforms' },
] as const;

/** The twelve categories of the chips, "Rooms & rentals" second (L2-020, L2-197). */
export const chipCategories = [
  categories[0],
  { slug: 'rooms-rentals', name: 'Rooms & rentals' },
  ...categories.slice(1),
] as const;
