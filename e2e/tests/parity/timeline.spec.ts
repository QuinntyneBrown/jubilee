import { parity } from '../../fixtures/parity';
import { RequestDetailPage } from '../../pages/request-detail.page';

// jb-timeline and its steps: the step in hand and the last one, still to come, on a member's
// confirmed request (L2-047). A done step is not compared: the mocks' times say something else than the
// app's recorded answers, so they differ in words, not in drawing.
parity('timeline', {
  cases: [
    {
      name: 'current',
      route: 'request-detail.confirmed',
      screen: (page) => new RequestDetailPage(page),
      region: (screen: RequestDetailPage) => screen.steps.nth(2),
    },
    {
      name: 'upcoming-last',
      route: 'request-detail.confirmed',
      screen: (page) => new RequestDetailPage(page),
      region: (screen: RequestDetailPage) => screen.steps.nth(3),
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no request and no overview of a business.',
    nearestFrame: 'home-1280.png',
  },
});
