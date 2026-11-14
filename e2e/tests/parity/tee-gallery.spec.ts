import { parity } from '../../fixtures/parity';
import { PurposeTeeBackScreen, PurposeTeePage } from '../../pages/purpose-tee.page';

// jb-tee-gallery: the stage and the Front and Back toggles.
parity('tee-gallery', {
  cases: [
    {
      name: 'front',
      route: 'purpose-tee',
      screen: (page) => new PurposeTeePage(page),
      region: (screen: PurposeTeePage) => screen.gallery,
    },
    {
      name: 'back',
      route: 'purpose-tee.back',
      screen: (page) => new PurposeTeeBackScreen(page),
      region: (screen: PurposeTeePage) => screen.gallery,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
