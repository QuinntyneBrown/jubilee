import { parity } from '../../fixtures/parity';
import { AdminStaffMenuScreen } from '../../pages/admin-records.page';

// jb-menu-label: the staff member's name and role over "Sign out" in their menu.
parity('menu-label', {
  cases: [
    {
      name: 'staff-menu',
      route: 'admin-records.staff-menu',
      screen: (page) => new AdminStaffMenuScreen(page),
      region: (screen: AdminStaffMenuScreen) => screen.staffMenuLabel,
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
