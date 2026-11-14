import { parity } from '../../fixtures/parity';
import { AdminRecordPage } from '../../pages/admin-record.page';

// jb-record-head: the name, status and ID of a member's record, with its actions; "Cancel" and
// "Save changes" while editing, "Saving…" and "Saved" after it, and a new record's (L2-283).
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
    {
      name: 'editing',
      route: 'admin-record.edit',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.head,
    },
    {
      name: 'saving',
      route: 'admin-record.saving',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.head,
      arrange: (screen: AdminRecordPage) => screen.saveAsDrawn(),
    },
    {
      name: 'saved',
      route: 'admin-record.saved',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.head,
      arrange: (screen: AdminRecordPage) => screen.saveRiverdale(),
    },
    {
      name: 'creating',
      route: 'admin-record.create',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.head,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
