import { parity } from '../../fixtures/parity';
import { SpacePage } from '../../pages/space.page';

// jb-included-list: what a space includes, each with a check (L2-205 AC1).
parity('included-list', {
  cases: [
    {
      name: 'short-stay',
      route: 'space.short-stay',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.includedList,
    },
  ],
  reference: {
    crops: [
      {
        case: 'short-stay',
        width: 1280,
        frame: 'space-short-stay-1280.png',
        clip: { x: 32, y: 952, width: 380, height: 118 },
        knownDifference:
          'The reference lists other inclusions for the suite (fresh linens, coffee) than the seeded space, which the mocks follow.',
      },
    ],
  },
});
