import { parity } from '../../fixtures/parity';
import { AdminShellPage } from '../../pages/admin-shell.page';
import { AdminListingsPage } from '../../pages/admin-listings.page';

// jb-admin-bar, the top bar of the admin application (L2-188): with the staff navigation for a
// moderator, and without it for a staff member who holds only the admin role.
parity('admin-bar', {
  cases: [
    {
      name: 'moderator',
      route: 'admin-listings',
      screen: (page) => new AdminListingsPage(page),
      region: (screen: AdminListingsPage) => screen.adminBar,
    },
    {
      name: 'admin-only',
      route: 'admin-shell.admin-only',
      screen: (page) => new AdminShellPage(page),
      region: (screen: AdminShellPage) => screen.adminBar,
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames show the app only; the admin application has no frame.',
    nearestFrame: 'home-1280.png',
  },
});
