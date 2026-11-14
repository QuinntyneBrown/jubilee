import { parity } from '../../fixtures/parity';
import { PurposeTeePage } from '../../pages/purpose-tee.page';

// jb-merch-head: the kicker, the name with its gold word, the price and the text.
parity('merch-head', {
  cases: [
    {
      name: 'default',
      route: 'purpose-tee',
      screen: (page) => new PurposeTeePage(page),
      region: (screen: PurposeTeePage) => screen.head,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
