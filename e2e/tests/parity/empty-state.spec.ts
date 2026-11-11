import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';
import { CategoryPage } from '../../pages/category.page';
import { SearchPage } from '../../pages/search.page';

// jb-empty-state: the empty block, its compact variant and its load-error variant.
parity('empty-state', {
  cases: [
    {
      name: 'compact',
      route: 'business.empty',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.servicesEmpty,
    },
    {
      name: 'error',
      route: 'search.error',
      screen: (page) => new SearchPage(page),
      region: (screen: SearchPage) => screen.errorState,
    },
    {
      name: 'empty',
      route: 'category.empty',
      screen: (page) => new CategoryPage(page),
      region: (screen: CategoryPage) => screen.emptyState,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns design has no empty, no-results or load-error state: every frame is filled.',
    nearestFrame: 'home-1280.png',
  },
});
