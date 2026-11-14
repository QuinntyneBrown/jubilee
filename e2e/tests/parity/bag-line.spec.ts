import { parity } from '../../fixtures/parity';
import { BagCheckoutScreen, BagDialog, BagScreen } from '../../pages/bag.dialog';

// jb-bag-line: a line of the bag, and a line with its problem.
parity('bag-line', {
  cases: [
    {
      name: 'default',
      route: 'bag',
      screen: (page) => new BagScreen(page),
      region: (screen: BagDialog) => screen.line('Men’s L').root,
    },
    {
      name: 'problem',
      route: 'bag.invalid',
      screen: (page) => new BagCheckoutScreen(page),
      region: (screen: BagDialog) => screen.line('Men’s 3XL').root,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
