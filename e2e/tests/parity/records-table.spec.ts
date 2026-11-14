import { parity } from '../../fixtures/parity';
import { AdminRecordsPage, AdminSelectedScreen } from '../../pages/admin-records.page';

// jb-records-table: the rows of the Members table, as a table from 768 px and a list below it;
// the same while loading; Job runs, read-only, without checkboxes; and two rows selected
// (L2-280 AC3).
parity('records-table', {
  cases: [
    {
      name: 'members',
      route: 'admin-records',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.records,
    },
    {
      name: 'loading',
      route: 'admin-records.loading',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.records,
      widths: [1280],
    },
    {
      name: 'read-only',
      route: 'admin-records.job-runs',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.records,
      widths: [1280],
    },
    {
      name: 'selected',
      route: 'admin-records.selected',
      screen: (page) => new AdminSelectedScreen(page),
      region: (screen: AdminSelectedScreen) => screen.records,
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
