import { parity } from '../../fixtures/parity';
import { AdminExportMenuScreen, AdminExportWeeklyScreen } from '../../pages/admin-records.page';

// jb-export-menu: Export beside a table's heading and its menu (L2-279 AC1, AC3): CSV and JSON of
// every record with the count, then the weekly e-mail, turned on or offered.
parity('export-menu', {
  cases: [
    {
      name: 'button',
      route: 'admin-records.export-menu',
      screen: (page) => new AdminExportMenuScreen(page),
      region: (screen: AdminExportMenuScreen) => screen.exportButton,
    },
    {
      name: 'menu',
      route: 'admin-records.export-menu',
      screen: (page) => new AdminExportMenuScreen(page),
      region: (screen: AdminExportMenuScreen) => screen.exportMenu,
    },
    {
      name: 'weekly',
      route: 'admin-records.export-weekly',
      screen: (page) => new AdminExportWeeklyScreen(page),
      region: (screen: AdminExportWeeklyScreen) => screen.exportMenu,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
