import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { SearchPage } from '../../pages/search.page';
import { SignInPage } from '../../pages/sign-in.page';

// jb-button: the variants and sizes, each on a screen state that shows it.
parity('button', {
  cases: [
    {
      name: 'primary',
      route: 'search.no-results',
      screen: (page) => new SearchPage(page),
      region: (screen: SearchPage) => screen.stateAction(/^Search/),
    },
    {
      name: 'default',
      route: 'search.error',
      screen: (page) => new SearchPage(page),
      region: (screen: SearchPage) => screen.backToBrowse,
    },
    {
      name: 'primary-large-block',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.signIn,
    },
    {
      name: 'ghost-icon-on-brand',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.notifications,
    },
    {
      name: 'primary-small',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.topBarLink('List your business'),
      widths: [1280],
    },
  ],
  reference: {
    crops: [
      {
        case: 'primary-small',
        width: 1280,
        frame: 'home-1280.png',
        clip: { x: 1019, y: 13, width: 177, height: 38 },
        knownDifference:
          'The reference draws the top-bar action 38 px tall, without a border, in Inter; the design system has it 32 px tall with a hairline border, in the system face.',
      },
    ],
  },
});
