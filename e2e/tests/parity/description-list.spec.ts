import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';
import { ProductPage } from '../../pages/product.page';
import { SpacePage } from '../../pages/space.page';

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
    {
      name: 'rows',
      route: 'space.short-stay',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.rowsList,
    },
  ],
  reference: {
    crops: [
      {
        case: 'rows',
        width: 1280,
        frame: 'space-short-stay-1280.png',
        clip: { x: 32, y: 780, width: 793, height: 92 },
        knownDifference:
          'The reference’s rental rows are taller (12 px above and below against 8 px) and span a wider main column than the mock’s split.',
      },
    ],
  },
});
