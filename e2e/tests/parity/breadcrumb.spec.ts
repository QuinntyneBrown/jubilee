import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';
import { CategoryPage } from '../../pages/category.page';
import { ProductPage } from '../../pages/product.page';

// jb-breadcrumb with two and with three steps, and jb-back-link.
parity('breadcrumb', {
  cases: [
    {
      name: 'two-steps',
      route: 'category',
      screen: (page) => new CategoryPage(page),
      region: (screen: CategoryPage) => screen.breadcrumb,
    },
    {
      name: 'three-steps',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.breadcrumb,
    },
    {
      name: 'back-link',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.backLink,
    },
  ],
  reference: {
    crops: [
      {
        case: 'back-link',
        width: 1280,
        frame: 'business-services-1280.png',
        clip: { x: 32, y: 76, width: 126, height: 44 },
        knownDifference:
          'The reference draws a smaller arrow closer to the words, in Inter; the design system has the arrow at the medium icon size with a wider gap, in the system face.',
      },
    ],
  },
});
