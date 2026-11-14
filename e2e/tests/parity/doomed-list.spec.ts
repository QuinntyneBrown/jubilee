import { parity } from '../../fixtures/parity';
import { AdminRecordConfirmDeleteScreen } from '../../pages/admin-record.page';
import {
  AdminConfirmDeleteOneScreen,
  AdminConfirmDeleteScreen,
} from '../../pages/admin-records.page';

// jb-doomed-list: the records the delete dialog names (L2-281 AC1, AC2): one from a row's or the
// record's "Delete", two from the selection.
parity('doomed-list', {
  cases: [
    {
      name: 'one',
      route: 'admin-records.confirm-delete-one',
      screen: (page) => new AdminConfirmDeleteOneScreen(page),
      region: (screen: AdminConfirmDeleteOneScreen) => screen.dialog.root.locator('.doomed'),
      // The row's actions are in the table, from 768 px; on a phone a record is deleted from its page.
      widths: [1280],
    },
    {
      name: 'selection',
      route: 'admin-records.confirm-delete',
      screen: (page) => new AdminConfirmDeleteScreen(page),
      region: (screen: AdminConfirmDeleteScreen) => screen.dialog.root.locator('.doomed'),
    },
    {
      name: 'record',
      route: 'admin-record.confirm-delete',
      screen: (page) => new AdminRecordConfirmDeleteScreen(page),
      region: (screen: AdminRecordConfirmDeleteScreen) => screen.dialog.root.locator('.doomed'),
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
