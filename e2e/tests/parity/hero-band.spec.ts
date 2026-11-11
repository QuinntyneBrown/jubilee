import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { WelcomePage } from '../../pages/welcome.page';

// jb-hero, jb-band, jb-feature-grid and jb-steps: the blocks the landing pages are made of.
parity('hero-band', {
  cases: [
    {
      name: 'hero',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.hero,
    },
    {
      name: 'hero-with-actions',
      route: 'welcome',
      screen: (page) => new WelcomePage(page),
      region: (screen: WelcomePage) => screen.hero,
    },
    {
      name: 'band',
      route: 'browse.signed-out',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.joinPanel,
    },
    {
      name: 'band-named',
      route: 'welcome',
      screen: (page) => new WelcomePage(page),
      region: (screen: WelcomePage) => screen.ownABusiness,
    },
    {
      name: 'feature-grid',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.featureGrid,
    },
    {
      name: 'steps',
      route: 'welcome',
      screen: (page) => new WelcomePage(page),
      region: (screen: WelcomePage) => screen.stepList,
    },
  ],
  reference: {
    crops: [
      {
        case: 'hero',
        width: 1280,
        frame: 'home-1280.png',
        clip: { x: 0, y: 64, width: 1280, height: 347 },
        knownDifference:
          'The reference sets the heading on two lines and its chips at regular weight, 1216 px wide; the design system holds the heading to 18ch, so three lines, with semibold chips in a 1184 px container.',
      },
    ],
  },
});
