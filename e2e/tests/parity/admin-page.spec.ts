import { parity } from '../../fixtures/parity';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-admin-page: the column of a screen of the admin application, here the read-only Job runs
// table, whose few rows keep the column within one screen.
parity('admin-page', {
  cases: [
    {
      name: 'wide',
      route: 'admin-records.job-runs',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.column,
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
