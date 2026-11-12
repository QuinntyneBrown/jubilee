import { parity } from '../../fixtures/parity';
import { SpacePage } from '../../pages/space.page';

// jb-host-card: who is renting the space, verified with a church reference (L2-204 AC1).
parity('host-card', {
  cases: [
    {
      name: 'short-stay',
      route: 'space.short-stay',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.hostCard,
    },
  ],
  reference: {
    crops: [
      {
        case: 'short-stay',
        width: 1280,
        frame: 'space-short-stay-1280.png',
        clip: { x: 887, y: 672, width: 362, height: 202 },
        knownDifference:
          'The reference’s side column is narrower than the mock’s split, so the about text wraps differently, and it sets the host’s name in the text face.',
      },
    ],
  },
});
