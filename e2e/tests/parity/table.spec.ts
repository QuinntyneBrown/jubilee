import { parity } from '../../fixtures/parity';
import { MyProductsPage } from '../../pages/my-products.page';

// jb-table in its frame: headings, values, figures set to the right, and the frame that scrolls.
// The verification team's queues are not compared: their mocks list other rows than the recorded
// answers, so they differ in what they hold, not in how they are drawn.
parity('table', {
  cases: [
    {
      name: 'products',
      route: 'my-products',
      screen: (page) => new MyProductsPage(page),
      region: (screen: MyProductsPage) => screen.tables.first(),
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no table.',
    nearestFrame: 'home-1280.png',
  },
});
