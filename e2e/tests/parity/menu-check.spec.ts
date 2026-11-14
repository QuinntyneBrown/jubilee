import { parity } from '../../fixtures/parity';
import { AdminColumnsMenuScreen } from '../../pages/admin-records.page';

// jb-menu-check and jb-menu-divider: the Columns menu of the Members table, its shown fields checked.
parity('menu-check', {
  cases: [
    {
      name: 'members',
      route: 'admin-records.columns-menu',
      screen: (page) => new AdminColumnsMenuScreen(page),
      region: (screen: AdminColumnsMenuScreen) => screen.columnsMenu,
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
