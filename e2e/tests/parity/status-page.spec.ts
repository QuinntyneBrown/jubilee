import { parity } from '../../fixtures/parity';
import { ForbiddenPage } from '../../pages/forbidden.page';
import { NotFoundPage } from '../../pages/not-found.page';

// jb-status-page: not found (two links) and no access (a link and a button).
parity('status-page', {
  cases: [
    {
      name: 'not-found',
      route: 'not-found',
      screen: (page) => new NotFoundPage(page),
      region: (screen: NotFoundPage) => screen.statusPage,
    },
    {
      name: 'forbidden',
      route: 'forbidden',
      screen: (page) => new ForbiddenPage(page),
      region: (screen: ForbiddenPage) => screen.statusPage,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no error page.',
    nearestFrame: 'home-1280.png',
  },
});
