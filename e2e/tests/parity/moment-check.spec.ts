import { parity } from '../../fixtures/parity';
import {
  ListBusinessCheckInLowScreen,
  ListBusinessCheckInThanksScreen,
  ListBusinessSubmittedScreen,
} from '../../pages/feedback.screens';

// jb-moment-check: the question as asked, after a low score (the field and "Send") and after a
// high score (the line of thanks).
parity('moment-check', {
  cases: [
    {
      name: 'asked',
      route: 'list-business.success',
      screen: (page) => new ListBusinessSubmittedScreen(page),
      region: (screen: ListBusinessSubmittedScreen) => screen.checkIn,
    },
    {
      name: 'low',
      route: 'list-business.success-check-in-low',
      screen: (page) => new ListBusinessCheckInLowScreen(page),
      region: (screen: ListBusinessCheckInLowScreen) => screen.checkIn,
    },
    {
      name: 'thanks',
      route: 'list-business.success-check-in-thanks',
      screen: (page) => new ListBusinessCheckInThanksScreen(page),
      region: (screen: ListBusinessCheckInThanksScreen) => screen.checkIn,
    },
  ],
  reference: {
    absent:
      'The Feedback frame is not among the captured Magic Patterns frames yet. Each case is compared with the reference once the owner saves it as components/moment-check/<case>-<width>.png (ADR 0060, docs/design-reference/magic-patterns/README.md).',
    nearestFrame: 'list-your-business-1280.png',
  },
});
