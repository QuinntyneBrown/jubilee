import { parity } from '../../fixtures/parity';
import { SpacePage } from '../../pages/space.page';

// jb-space-facts: up to four key facts of a space as a ruled grid (L2-205 AC1).
parity('space-facts', {
  cases: [
    {
      name: 'short-stay',
      route: 'space.short-stay',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.factsList,
    },
  ],
  reference: {
    crops: [
      {
        case: 'short-stay',
        width: 1280,
        frame: 'space-short-stay-1280.png',
        clip: { x: 31, y: 720, width: 794, height: 48 },
        knownDifference:
          'The reference’s main column is wider than the mock’s split (794 px against 704 px at 1280), so each fact is wider.',
      },
    ],
  },
});
