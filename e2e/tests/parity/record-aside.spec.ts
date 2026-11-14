import { parity } from '../../fixtures/parity';
import { AdminRecordPage } from '../../pages/admin-record.page';

// jb-record-aside: what points at a member's record, and its history.
parity('record-aside', {
  cases: [
    {
      name: 'member',
      route: 'admin-record',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.aside,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
