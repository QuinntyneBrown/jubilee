import { parity } from '../../fixtures/parity';
import { PurposeTeeAddedScreen, PurposeTeePage } from '../../pages/purpose-tee.page';

// jb-add-to-bag: the quantity and the button, then "Added to bag" and "Check out".
parity('add-to-bag', {
  cases: [
    {
      name: 'default',
      route: 'purpose-tee',
      screen: (page) => new PurposeTeePage(page),
      region: (screen: PurposeTeePage) => screen.addToBag,
    },
    {
      name: 'added',
      route: 'purpose-tee.added',
      screen: (page) => new PurposeTeeAddedScreen(page),
      region: (screen: PurposeTeePage) => screen.addToBag,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
