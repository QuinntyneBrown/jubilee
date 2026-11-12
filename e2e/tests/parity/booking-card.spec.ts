import { parity } from '../../fixtures/parity';
import { SpacePage } from '../../pages/space.page';

// jb-booking-card: the rent, the minimum stay and the call to action of a space (L2-205 AC1).
parity('booking-card', {
  cases: [
    {
      name: 'short-stay',
      route: 'space.short-stay',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.bookingCard.root,
    },
    {
      name: 'room',
      route: 'space.room',
      screen: (page) => new SpacePage(page),
      region: (screen: SpacePage) => screen.bookingCard.root,
    },
  ],
  reference: {
    crops: [
      {
        case: 'short-stay',
        width: 1280,
        frame: 'space-short-stay-1280.png',
        clip: { x: 828, y: 312, width: 421, height: 322 },
        knownDifference:
          'The reference asks for check-in and check-out dates and totals the stay in the card; Jubilee defers calendars and payment (ADR 0041), so the card has the rent, the minimum stay and the call to action, and the dates go in the request.',
      },
      {
        case: 'room',
        width: 1280,
        frame: 'space-room-1280.png',
        clip: { x: 828, y: 333, width: 421, height: 247 },
        knownDifference:
          'The reference asks for a move-in date and a length of stay in the card; Jubilee asks for them in the request (ADR 0041).',
      },
    ],
  },
});
