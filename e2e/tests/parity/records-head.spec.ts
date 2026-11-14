import { parity } from '../../fixtures/parity';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-records-head: the heading of the Members table with Export beside it.
parity('records-head', {
  cases: [
    {
      name: 'members',
      route: 'admin-records',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.head,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
