import { parity } from '../../fixtures/parity';
import {
  PurposeTeeLowStockScreen,
  PurposeTeePage,
  PurposeTeePickSizeScreen,
  PurposeTeeSizeGuideScreen,
  PurposeTeeSoldOutSizeScreen,
} from '../../pages/purpose-tee.page';

// jb-size-picker: the sizes, the line, the nudge, a sold-out size and the guide.
parity('size-picker', {
  cases: [
    {
      name: 'default',
      route: 'purpose-tee',
      screen: (page) => new PurposeTeePage(page),
      region: (screen: PurposeTeePage) => screen.sizes,
    },
    {
      name: 'nudge',
      route: 'purpose-tee.pick-size',
      screen: (page) => new PurposeTeePickSizeScreen(page),
      region: (screen: PurposeTeePage) => screen.sizes,
    },
    {
      name: 'sold-out',
      route: 'purpose-tee.sold-out-size',
      screen: (page) => new PurposeTeeSoldOutSizeScreen(page),
      region: (screen: PurposeTeePage) => screen.sizes,
    },
    {
      name: 'low-stock',
      route: 'purpose-tee.low-stock',
      screen: (page) => new PurposeTeeLowStockScreen(page),
      region: (screen: PurposeTeePage) => screen.sizes,
    },
    {
      name: 'guide',
      route: 'purpose-tee.size-guide',
      screen: (page) => new PurposeTeeSizeGuideScreen(page),
      region: (screen: PurposeTeePage) => screen.sizes,
    },
  ],
  reference: {
    absent:
      'The Purpose Tee frame is in the Magic Patterns canvas but not captured here (see the README).',
    nearestFrame: 'home-1280.png',
  },
});
