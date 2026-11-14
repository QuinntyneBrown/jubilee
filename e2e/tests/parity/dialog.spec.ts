import { parity } from '../../fixtures/parity';
import { AdminRecordConfirmDeleteScreen } from '../../pages/admin-record.page';
import {
  AdminConfirmDeleteOneScreen,
  AdminConfirmDeleteScreen,
  AdminExportReasonScreen,
} from '../../pages/admin-records.page';
import { RequestItemDialog } from '../../pages/messages.page';

// jb-dialog: the header (icon, title, description, close button) and the footer of a dialog,
// as a bottom sheet at 360 px and a centred panel at 1280 px.
parity('dialog', {
  cases: [
    {
      name: 'header',
      route: 'order-request',
      screen: (page) => new RequestItemDialog(page),
      region: (screen: RequestItemDialog) => screen.header,
    },
    {
      name: 'footer',
      route: 'order-request',
      screen: (page) => new RequestItemDialog(page),
      region: (screen: RequestItemDialog) => screen.footer,
    },
    {
      // The admin application's alert dialog that asks before deleting (L2-281 AC1, AC2).
      name: 'delete-one',
      route: 'admin-records.confirm-delete-one',
      screen: (page) => new AdminConfirmDeleteOneScreen(page),
      region: (screen: AdminConfirmDeleteOneScreen) => screen.dialog.root.locator('.dialog__panel'),
      // The row's actions are in the table, from 768 px; on a phone a record is deleted from its page.
      widths: [1280],
    },
    {
      name: 'delete-selection',
      route: 'admin-records.confirm-delete',
      screen: (page) => new AdminConfirmDeleteScreen(page),
      region: (screen: AdminConfirmDeleteScreen) => screen.dialog.root.locator('.dialog__panel'),
    },
    {
      name: 'delete-record',
      route: 'admin-record.confirm-delete',
      screen: (page) => new AdminRecordConfirmDeleteScreen(page),
      region: (screen: AdminRecordConfirmDeleteScreen) =>
        screen.dialog.root.locator('.dialog__panel'),
      widths: [1280],
    },
    {
      // A private table asks why before it exports (L2-279 AC4).
      name: 'export-reason',
      route: 'admin-records.export-reason',
      screen: (page) => new AdminExportReasonScreen(page),
      region: (screen: AdminExportReasonScreen) => screen.dialog.root.locator('.dialog__panel'),
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no dialog.',
    nearestFrame: 'business-shop-1280.png',
  },
});
