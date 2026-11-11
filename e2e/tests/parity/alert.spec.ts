import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { RequestDetailPage } from '../../pages/request-detail.page';

// jb-alert: tones with a heading, and the banner under the top bar with its actions.
parity('alert', {
  cases: [
    {
      name: 'info',
      route: 'request-detail',
      screen: (page) => new RequestDetailPage(page),
      region: (screen: RequestDetailPage) => screen.callout,
      // On a phone the mock shortens the business name, so the heading wraps differently.
      widths: [1280],
    },
    {
      name: 'success',
      route: 'request-detail.confirmed',
      screen: (page) => new RequestDetailPage(page),
      region: (screen: RequestDetailPage) => screen.callout,
    },
    {
      name: 'banner',
      route: 'verify-email-banner',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.chromeBanner,
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no alert and no banner.',
    nearestFrame: 'home-1280.png',
  },
});
