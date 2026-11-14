import { parity } from '../../fixtures/parity';
import { AdminOverviewPage } from '../../pages/admin-overview.page';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-admin-heading: the group, name and sentence of the Members table, and the overview's greeting
// with the day and "Since yesterday" (L2-274 AC1).
parity('admin-heading', {
  cases: [
    {
      name: 'table',
      route: 'admin-records',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.headingBlock,
    },
    {
      name: 'greeting',
      route: 'admin-overview',
      screen: (page) => new AdminOverviewPage(page),
      region: (screen: AdminOverviewPage) => screen.headingBlock,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
