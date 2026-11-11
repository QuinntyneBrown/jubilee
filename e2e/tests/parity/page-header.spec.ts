import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';
import { ProductPage } from '../../pages/product.page';
import { RequestDetailPage } from '../../pages/request-detail.page';
import { RequestsPage } from '../../pages/requests.page';
import { SavedPage } from '../../pages/saved.page';

// jb-page-header: with a subtitle, with a badge in its subtitle and with actions; and
// jb-detail-head with its kicker and its actions, on a business and on a product.
parity('page-header', {
  cases: [
    {
      name: 'with-subtitle',
      route: 'saved',
      screen: (page) => new SavedPage(page),
      region: (screen: SavedPage) => screen.pageHeader,
    },
    {
      name: 'with-actions',
      route: 'requests',
      screen: (page) => new RequestsPage(page),
      region: (screen: RequestsPage) => screen.pageHeader,
    },
    {
      name: 'with-a-badge',
      route: 'request-detail',
      screen: (page) => new RequestDetailPage(page),
      region: (screen: RequestDetailPage) => screen.pageHeader,
    },
    {
      name: 'detail-head',
      // At 360 px the head is taller than the room above the tab bar, which then covers its end.
      widths: [1280],
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.detailHead,
    },
    {
      name: 'detail-head-actions',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.actions,
    },
    {
      name: 'detail-head-actions-of-a-business',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.actions,
    },
    {
      name: 'detail-head-kicker',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.soldBy,
    },
  ],
  reference: {
    crops: [
      {
        case: 'detail-head',
        width: 1280,
        frame: 'business-services-1280.png',
        clip: { x: 828, y: 226, width: 420, height: 278 },
        knownDifference:
          'The reference gives the head a 420 px column and two round actions beside Book a meeting, in Inter; the design system has a 440 px column and a third action, Share, in the system face.',
      },
    ],
  },
});
