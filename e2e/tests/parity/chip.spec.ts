import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { CategoryPage } from '../../pages/category.page';
import { ProductPage } from '../../pages/product.page';

// jb-chip (links in a jb-chip-row on the brand colour, filter buttons) and jb-chip-option.
parity('chip', {
  cases: [
    {
      name: 'row-on-brand',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.categoryRow,
    },
    {
      name: 'filters',
      route: 'category',
      screen: (page) => new CategoryPage(page),
      region: (screen: CategoryPage) => screen.filterChips,
      widths: [1280],
    },
    {
      name: 'option',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.optionChips.first(),
    },
  ],
  reference: {
    crops: [
      {
        case: 'row-on-brand',
        width: 1280,
        frame: 'home-1280.png',
        clip: { x: 28, y: 291, width: 1224, height: 90 },
        knownDifference:
          'The reference chips on the hero are about 36 px tall, in Inter at a medium weight; the design system draws them 44 px tall (--control-height-md, the touch target) with the semibold label, in the system text face.',
      },
    ],
  },
});
