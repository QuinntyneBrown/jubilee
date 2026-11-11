import { parity } from '../../fixtures/parity';
import { MyBusinessPage } from '../../pages/my-business.page';

// jb-timeline and its steps: the step in hand and the last one, still to come. A done and a
// stopped step are not compared: every one the mocks show says something else than the app's
// recorded answers ("Today, 9:40 a.m." against "today"), so they differ in words, not in drawing.
parity('timeline', {
  cases: [
    {
      name: 'current',
      route: 'my-business.changes-requested',
      screen: (page) => new MyBusinessPage(page),
      region: (screen: MyBusinessPage) => screen.timeline.nth(2),
    },
    {
      name: 'upcoming-last',
      route: 'my-business.pending',
      screen: (page) => new MyBusinessPage(page),
      region: (screen: MyBusinessPage) => screen.timeline.nth(3),
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no request and no overview of a business.',
    nearestFrame: 'home-1280.png',
  },
});
