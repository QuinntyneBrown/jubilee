import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { CategoryPage } from '../../pages/category.page';

// jb-skeleton, alone and in its two compositions: the card grid and the row list.
parity('skeleton', {
  cases: [
    {
      name: 'title',
      route: 'browse.loading',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.skeletons.first(),
    },
    {
      name: 'row-list',
      route: 'browse.loading',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.loadingRows,
    },
    {
      name: 'card',
      route: 'category.loading',
      screen: (page) => new CategoryPage(page),
      region: (screen: CategoryPage) => screen.loadingCards.first(),
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no loading state.',
    nearestFrame: 'home-1280.png',
  },
});
