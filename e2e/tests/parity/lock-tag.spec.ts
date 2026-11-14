import { parity } from '../../fixtures/parity';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-lock-tag: "Read-only" beside the name of Job runs, a table of the System group.
parity('lock-tag', {
  cases: [
    {
      name: 'beside-a-title',
      route: 'admin-records.job-runs',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.lockTag,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
