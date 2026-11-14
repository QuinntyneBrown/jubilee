import { parity } from '../../fixtures/parity';
import { AdminRecordPage } from '../../pages/admin-record.page';

// jb-record-fields: the fields of a member's record by type; the same while loading; each
// field as the editor of its type while editing, and empty while creating (L2-283).
parity('record-fields', {
  cases: [
    {
      name: 'member',
      route: 'admin-record',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.fields,
    },
    {
      name: 'loading',
      route: 'admin-record.loading',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.fields,
      widths: [1280],
    },
    {
      name: 'editing',
      route: 'admin-record.edit',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.fields,
    },
    {
      name: 'creating',
      route: 'admin-record.create',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.fields,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
