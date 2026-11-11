import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { IncomingRequestsPage } from '../../pages/incoming-requests.page';

// jb-avatar: the member's own, as the account menu button in the top bar, and the avatar of a row.
parity('avatar', {
  cases: [
    {
      name: 'account-button',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.avatar,
      widths: [1280],
    },
    {
      name: 'row',
      route: 'incoming-requests',
      screen: (page) => new IncomingRequestsPage(page),
      region: (screen: IncomingRequestsPage) => screen.rowAvatars.first(),
    },
  ],
  reference: {
    crops: [
      {
        case: 'account-button',
        width: 1280,
        frame: 'home-1280.png',
        clip: { x: 1211, y: 14, width: 36, height: 36 },
        knownDifference:
          'The reference avatar in the top bar is 36 px across; the design system draws the small avatar at --avatar-size-sm, 32 px.',
      },
    ],
  },
});
