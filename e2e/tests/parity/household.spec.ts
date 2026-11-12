import { parity } from '../../fixtures/parity';
import { SpacePage } from '../../pages/space.page';

// jb-household: "Who lives here" on a Room or Roommate space (L2-205 AC2).
parity('household', {
  cases: [
    {
      name: 'room',
      route: 'space.room',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.household,
    },
  ],
  reference: {
    crops: [
      {
        case: 'room',
        width: 1280,
        frame: 'space-room-1280.png',
        clip: { x: 887, y: 640, width: 362, height: 254 },
        knownDifference:
          'The reference lists each member of the household with an initial; Jubilee shows the household as the owner wrote it, one text (L2-199), so there are no people to list.',
      },
    ],
  },
});
