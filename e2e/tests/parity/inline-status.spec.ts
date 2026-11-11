import { parity } from '../../fixtures/parity';
import { EditListingPage } from '../../pages/edit-listing.page';
import { ProductPage } from '../../pages/product.page';

// jb-inline-status: plain beside the actions of a form, and a success with its icon in place
// of a button.
parity('inline-status', {
  cases: [
    {
      name: 'plain',
      route: 'edit-listing',
      screen: (page) => new EditListingPage(page),
      region: (screen: EditListingPage) => screen.status,
    },
    {
      name: 'success-with-icon',
      route: 'product.alert-requested',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.alertStatus,
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no inline status.',
    nearestFrame: 'business-shop-1280.png',
  },
});
