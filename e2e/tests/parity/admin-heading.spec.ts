import { parity } from '../../fixtures/parity';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-admin-heading: the group, name and sentence of the Members table.
parity('admin-heading', {
  cases: [
    {
      name: 'table',
      route: 'admin-records',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.headingBlock,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
