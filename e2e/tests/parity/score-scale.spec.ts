import { parity } from '../../fixtures/parity';
import { FeedbackPage } from '../../pages/feedback.page';
import {
  ListBusinessCheckInLowScreen,
  ListBusinessSubmittedScreen,
} from '../../pages/feedback.screens';

// jb-score-scale: the square scores of one part of Jubilee, and the wide scale of a check-in
// with nothing chosen and with a score chosen.
parity('score-scale', {
  cases: [
    {
      name: 'part',
      route: 'feedback',
      screen: (page) => new FeedbackPage(page),
      region: (screen: FeedbackPage) => screen.area('Finding businesses'),
    },
    {
      name: 'wide',
      route: 'list-business.success',
      screen: (page) => new ListBusinessSubmittedScreen(page),
      region: (screen: ListBusinessSubmittedScreen) => screen.check.scores,
    },
    {
      name: 'wide-chosen',
      route: 'list-business.success-check-in-low',
      screen: (page) => new ListBusinessCheckInLowScreen(page),
      region: (screen: ListBusinessCheckInLowScreen) => screen.check.scores,
    },
  ],
  reference: {
    absent:
      'The Feedback frame is not among the captured Magic Patterns frames yet; the owner exports it (docs/design-reference/magic-patterns/README.md).',
    nearestFrame: 'list-your-business-1280.png',
  },
});
