import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { CategoryPage } from '../../pages/category.page';
import { SearchPage } from '../../pages/search.page';

// jb-space-card: on the rooms shelf of Browse, in the Rooms & rentals category (L2-202) and in
// search (L2-203).
parity('space-card', {
  cases: [
    {
      name: 'shelf',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.spaceCard(0).root,
    },
    {
      name: 'category',
      route: 'category.rooms-rentals',
      screen: (page) => new CategoryPage(page),
      region: (screen: CategoryPage) => screen.spaceCard(1).root,
    },
    {
      name: 'search',
      route: 'search.spaces',
      screen: (page) => new SearchPage(page),
      region: (screen: SearchPage) => screen.spaceCard(0).root,
    },
  ],
  reference: {
    crops: [
      {
        case: 'shelf',
        width: 1280,
        frame: 'browse-rooms-shelf-1280.png',
        clip: { x: 31, y: 1411, width: 284, height: 350 },
        knownDifference:
          'The reference draws each space with a photo and orders the shelf differently; the app draws a tinted tile by term until spaces have photos (L2-088), as for business cards.',
      },
    ],
  },
});
