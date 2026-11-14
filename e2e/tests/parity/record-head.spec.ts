import { parity } from '../../fixtures/parity';
import { AdminRecordPage } from '../../pages/admin-record.page';

// jb-record-head: the name, status and ID of a member's record, with its actions.
parity('record-head', {
  cases: [
    {
      name: 'member',
      route: 'admin-record',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.head,
    },
    {
      name: 'loading',
      route: 'admin-record.loading',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.head,
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
