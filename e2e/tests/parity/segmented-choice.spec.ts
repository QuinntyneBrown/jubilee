import { parity } from '../../fixtures/parity';
import { PurposeTeePage, PurposeTeeSoldOutSizeScreen } from '../../pages/purpose-tee.page';

// jb-segmented-choice: the fits on their track, Men's and Youth chosen.
parity('segmented-choice', {
  cases: [
    {
      name: 'mens',
      route: 'purpose-tee',
      screen: (page) => new PurposeTeePage(page),
      region: (screen: PurposeTeePage) => screen.fit,
    },
    {
      name: 'youth',
      route: 'purpose-tee.sold-out-size',
      screen: (page) => new PurposeTeeSoldOutSizeScreen(page),
      region: (screen: PurposeTeePage) => screen.fit,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
