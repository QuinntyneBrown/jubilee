import { parity } from '../../fixtures/parity';
import { ListBusinessPage } from '../../pages/list-business.page';

// jb-choice-cards with its two jb-choice-card: one chosen, one not.
parity('choice-card', {
  cases: [
    {
      name: 'pair',
      route: 'list-business',
      screen: (page) => new ListBusinessPage(page),
      region: (screen: ListBusinessPage) => screen.offerCards,
    },
  ],
  reference: {
    crops: [
      {
        case: 'pair',
        width: 1280,
        frame: 'list-your-business-1280.png',
        clip: { x: 94, y: 263, width: 708, height: 100 },
        knownDifference:
          'The reference cards have a 16 px radius, a 2 px ink border when chosen, a 40 px icon disc and Inter; the design system cards use --radius-lg, a hairline border doubled by a shadow, the avatar-size disc and the system text face. The copy also differs ("lawyers, trades, counselling" in the reference).',
      },
    ],
  },
});
