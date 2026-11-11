import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';
import { ProductPage } from '../../pages/product.page';

// jb-description-list: side by side, and one under the other on a phone. A request's details
// are not compared: the mock's request says other things than the recorded one.
parity('description-list', {
  cases: [
    {
      name: 'business',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.descriptionLists.first(),
    },
    {
      name: 'product',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.descriptionLists.first(),
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames of a business show its services and its About text, and no list of labels and values.',
    nearestFrame: 'business-services-1280.png',
  },
});
