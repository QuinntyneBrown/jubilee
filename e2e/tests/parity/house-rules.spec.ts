import { parity } from '../../fixtures/parity';
import { SpacePage } from '../../pages/space.page';

// jb-house-rules: the house rules of a space, one a line (L2-196 AC1).
parity('house-rules', {
  cases: [
    {
      name: 'short-stay',
      route: 'space.short-stay',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.rulesList,
    },
  ],
  reference: {
    crops: [
      {
        case: 'short-stay',
        width: 1280,
        frame: 'space-short-stay-1280.png',
        clip: { x: 446, y: 952, width: 380, height: 88 },
        knownDifference:
          'The reference rules each line with a lighter border and spaces the rules wider than the mock.',
      },
    ],
  },
});
