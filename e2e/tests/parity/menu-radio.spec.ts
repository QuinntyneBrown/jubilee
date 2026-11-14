import { parity } from '../../fixtures/parity';
import { AdminRowsMenuScreen } from '../../pages/admin-records.page';

// jb-menu-radio: the Rows per page menu of the Members table, 25 checked.
parity('menu-radio', {
  cases: [
    {
      name: 'members',
      route: 'admin-records.page-size-menu',
      screen: (page) => new AdminRowsMenuScreen(page),
      region: (screen: AdminRowsMenuScreen) => screen.rowsMenu,
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
