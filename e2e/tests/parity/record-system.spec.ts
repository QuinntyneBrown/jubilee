import { parity } from '../../fixtures/parity';
import { AdminRecordPage } from '../../pages/admin-record.page';

// jb-record-system: the ID and creation time under a member's fields.
parity('record-system', {
  cases: [
    {
      name: 'member',
      route: 'admin-record',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.system,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
