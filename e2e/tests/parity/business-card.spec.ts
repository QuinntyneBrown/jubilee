import { parity } from '../../fixtures/parity';
import { AdminVerificationPage } from '../../pages/admin-verification.page';
import { BrowsePage } from '../../pages/browse.page';
import { BusinessPage } from '../../pages/business.page';
import { SavedPage } from '../../pages/saved.page';

// jb-business-card, jb-product-card and the preview of a listing that is not live yet.
parity('business-card', {
  cases: [
    {
      name: 'business',
      route: 'saved',
      screen: (page) => new SavedPage(page),
      region: (screen: SavedPage) => screen.businessCard('Legacy Financial'),
    },
    {
      name: 'product',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.productCard(0).root,
    },
    {
      name: 'product-sold-out',
      route: 'shop.sold-out',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.productCard(1).root,
    },
    {
      name: 'preview',
      route: 'admin-verification',
      screen: (page) => new AdminVerificationPage(page),
      region: (screen: AdminVerificationPage) => screen.preview,
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames draw a business as a photo card; the app draws a tinted tile until listings have photos, which is recorded as a known difference of the home page.',
    nearestFrame: 'home-1280.png',
  },
});
