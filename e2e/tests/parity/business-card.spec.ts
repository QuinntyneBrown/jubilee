import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { BusinessPage } from '../../pages/business.page';
import { ListBusinessPage } from '../../pages/list-business.page';
import { SavedPage } from '../../pages/saved.page';

// jb-business-card, jb-product-card and the preview of a listing as members see it.
parity('business-card', {
  cases: [
    {
      name: 'business',
      route: 'saved',
      screen: (page) => new SavedPage(page),
      region: (screen: SavedPage) => screen.businessCard('Legacy Financial'),
    },
    {
      name: 'replies-fast',
      route: 'business.replies-fast',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.relatedCard(0).root,
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
      // The owner's highlight, the green line before "Not published yet" (L2-076 AC1).
      name: 'preview-highlight',
      route: 'list-business',
      screen: (page) => new ListBusinessPage(page),
      region: (screen: ListBusinessPage) => screen.previewCard,
      arrange: (screen: ListBusinessPage) => screen.fillExample(),
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames draw a business as a photo card; the app draws a tinted tile until listings have photos, which is recorded as a known difference of the home page.',
    nearestFrame: 'home-1280.png',
  },
});
