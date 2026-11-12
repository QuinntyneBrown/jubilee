import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';
import { MyProductsPage } from '../../pages/my-products.page';
import { RequestsPage } from '../../pages/requests.page';

// jb-badge: a state in a row, in a table and in the head of a listing, and a count in the top bar.
//
// The two states are each compared at one width. At the other, the text above the badge leaves
// it a fraction of a pixel off, by a different fraction in the mock and in the app, and the
// screenshot rounds that to a region one pixel larger: a difference of position, not of the badge.
parity('badge', {
  cases: [
    {
      name: 'tone',
      route: 'requests',
      screen: (page) => new RequestsPage(page),
      region: (screen: RequestsPage) => screen.statusBadges.first(),
      widths: [1280],
    },
    {
      name: 'in-a-table',
      route: 'my-products',
      screen: (page) => new MyProductsPage(page),
      region: (screen: MyProductsPage) => screen.statusBadges.first(),
      widths: [360],
    },
    {
      name: 'replies-fast',
      route: 'business.replies-fast',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.repliesFast,
      widths: [1280],
    },
    {
      name: 'count',
      route: 'my-products',
      screen: (page) => new MyProductsPage(page),
      region: (screen: MyProductsPage) => screen.badgeIn(screen.topBarLink(/^Messages/)),
      widths: [1280],
    },
  ],
  reference: {
    crops: [
      {
        case: 'count',
        width: 1280,
        frame: 'home-1280.png',
        clip: { x: 967, y: 22, width: 20, height: 20 },
        knownDifference:
          'The reference count is a 20 px circle with its numeral in Inter; the design system draws it at the badge height with the label face, 1 px wider.',
      },
    ],
  },
});
