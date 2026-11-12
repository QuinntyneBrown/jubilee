import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { CategoryPage } from '../../pages/category.page';

// jb-term-filter: "Any length" and the four terms, on Browse and on Rooms & rentals (L2-200 AC2).
parity('term-filter', {
  cases: [
    {
      name: 'shelf',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.roomsFilter.root,
    },
    {
      name: 'category',
      route: 'category.rooms-rentals',
      screen: (page) => new CategoryPage(page),
      region: (screen: CategoryPage) => screen.termFilter.root,
    },
  ],
  reference: {
    crops: [
      {
        case: 'shelf',
        width: 1280,
        frame: 'browse-rooms-shelf-1280.png',
        clip: { x: 28, y: 1350, width: 545, height: 44 },
        knownDifference:
          'The reference chips are about 36 px tall with the pressed chip filled in ink, in Inter; the design system draws them 44 px tall (--control-height-md) with the pressed chip in the brand colour, as every chip.',
      },
    ],
  },
});
