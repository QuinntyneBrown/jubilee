import { parity } from '../../fixtures/parity';
import { PurposeTeePage } from '../../pages/purpose-tee.page';

// jb-merch-story: why “purpose” is the gold word.
parity('merch-story', {
  cases: [
    {
      name: 'default',
      route: 'purpose-tee',
      screen: (page) => new PurposeTeePage(page),
      region: (screen: PurposeTeePage) => screen.story,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
