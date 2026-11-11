import { parity } from '../../fixtures/parity';
import { ProductPage, ProductWithSizeScreen } from '../../pages/product.page';

// jb-product-request-form: its options, its quantity and its actions, in stock and sold out.
// The form draws no box of its own, so its parts are compared one by one.
parity('product-request-form', {
  cases: [
    {
      name: 'options',
      route: 'product',
      // As the mock shows it: size M chosen.
      screen: (page) => new ProductWithSizeScreen(page),
      region: (screen: ProductPage) => screen.optionGroup,
    },
    {
      name: 'quantity',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.quantityField,
    },
    {
      name: 'actions',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.actions,
    },
    {
      name: 'sold-out-options',
      route: 'product.sold-out',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.optionGroup,
    },
    {
      name: 'sold-out-alert',
      route: 'product.sold-out',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.soldOutAlert,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no product page.',
    nearestFrame: 'business-services-1280.png',
  },
});
