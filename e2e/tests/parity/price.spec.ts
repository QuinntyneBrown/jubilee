import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { ProductPage } from '../../pages/product.page';

// jb-price: large at the head of a product, and at its usual size on a product card.
parity('price', {
  cases: [
    {
      name: 'large',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.price,
    },
    {
      name: 'card',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.productCard(0).price,
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames show the price of a service in its row, which jb-row-price draws, and no price of a product.',
    nearestFrame: 'business-services-1280.png',
  },
});
