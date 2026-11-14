import { parity } from '../../fixtures/parity';
import { PurposeTeeAddedScreen, PurposeTeePage } from '../../pages/purpose-tee.page';

// jb-bag-button: empty, and holding a shirt.
parity('bag-button', {
  cases: [
    {
      name: 'empty',
      route: 'purpose-tee',
      screen: (page) => new PurposeTeePage(page),
      region: (screen: PurposeTeePage) => screen.bagButton,
    },
    {
      name: 'filled',
      route: 'purpose-tee.added',
      screen: (page) => new PurposeTeeAddedScreen(page),
      region: (screen: PurposeTeePage) => screen.bagButton,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
