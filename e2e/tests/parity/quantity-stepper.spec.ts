import { parity } from '../../fixtures/parity';
import { PurposeTeePage } from '../../pages/purpose-tee.page';
import { BagDialog, BagScreen } from '../../pages/bag.dialog';

// jb-quantity-stepper: on the page, and small in a line of the bag.
parity('quantity-stepper', {
  cases: [
    {
      name: 'page',
      route: 'purpose-tee',
      screen: (page) => new PurposeTeePage(page),
      region: (screen: PurposeTeePage) => screen.quantity,
    },
    {
      name: 'bag',
      route: 'bag',
      screen: (page) => new BagScreen(page),
      region: (screen: BagDialog) => screen.line('Men’s L').quantity,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
