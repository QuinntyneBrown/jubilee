import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { BusinessPage } from '../../pages/business.page';

// jb-section: its head with a heading alone, with a link beside it and with a projected count.
parity('section', {
  cases: [
    {
      name: 'head',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.sectionHeads.filter({ hasText: 'Featured this week' }),
    },
    {
      name: 'head-with-link',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.sectionHeads.filter({ hasText: 'From the shops' }),
    },
    {
      name: 'head-with-count',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.sectionHeads.first(),
    },
  ],
  reference: {
    crops: [
      {
        case: 'head-with-link',
        width: 1280,
        frame: 'home-1280.png',
        clip: { x: 32, y: 1252, width: 1216, height: 36 },
        knownDifference:
          'The reference lays the page out 1216 px wide and ends the link with a chevron; the design system has a 1184 px container and a link without one, in the system face.',
      },
    ],
  },
});
