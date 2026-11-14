import { parity } from '../../fixtures/parity';
import { AdminRecordPage } from '../../pages/admin-record.page';

// jb-record-crumbs: the way back from a member's record to Members, and its ID.
parity('record-crumbs', {
  cases: [
    {
      name: 'member',
      route: 'admin-record',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.crumbs,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
