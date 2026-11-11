import { parity } from '../../fixtures/parity';
import { MyBusinessPage } from '../../pages/my-business.page';

// jb-stat and jb-stat-grid: a figure that rose, one with a plain note, and the grid of four.
parity('stat', {
  cases: [
    {
      name: 'rising',
      route: 'my-business',
      screen: (page) => new MyBusinessPage(page),
      region: (screen: MyBusinessPage) => screen.stats.nth(0),
    },
    {
      name: 'plain',
      route: 'my-business',
      screen: (page) => new MyBusinessPage(page),
      region: (screen: MyBusinessPage) => screen.stats.nth(2),
    },
    {
      name: 'grid',
      route: 'my-business',
      screen: (page) => new MyBusinessPage(page),
      region: (screen: MyBusinessPage) => screen.statGrid,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no overview of a business.',
    nearestFrame: 'home-1280.png',
  },
});
