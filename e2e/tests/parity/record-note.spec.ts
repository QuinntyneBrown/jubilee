import { parity } from '../../fixtures/parity';
import { AdminRecordPage } from '../../pages/admin-record.page';

// jb-record-note: what a record says under its heading (L2-284): a System table's plain note, and
// the warning that opening a message was written to Audit records. One's own listing, the third,
// is drawn on a listing, whose record opens the moderation screen until the old screens retire.
parity('record-note', {
  cases: [
    {
      name: 'read-only',
      route: 'admin-record.job-runs',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.note,
    },
    {
      name: 'private-read',
      route: 'admin-record.messages',
      screen: (page) => new AdminRecordPage(page),
      region: (screen: AdminRecordPage) => screen.note,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
