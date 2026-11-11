import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { CategoryPage } from '../../pages/category.page';
import { SavedPage } from '../../pages/saved.page';

// The containers cards sit in: jb-card-grid, jb-scroller, jb-directory-group and jb-saved-card.
parity('card-grid', {
  cases: [
    {
      name: 'grid',
      route: 'category',
      screen: (page) => new CategoryPage(page),
      region: (screen: CategoryPage) => screen.cardGrids.first(),
    },
    {
      name: 'scroller',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.scroller,
    },
    {
      name: 'directory-group',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.groups.first(),
    },
    {
      name: 'saved-card',
      route: 'saved',
      screen: (page) => new SavedPage(page),
      region: (screen: SavedPage) => screen.card('Legacy Financial'),
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns home lays businesses out as one grid of photo cards, with no directory groups, scroller or saved list.',
    nearestFrame: 'home-1280.png',
  },
});
