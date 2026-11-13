import { parity } from '../../fixtures/parity';
import { FeedbackPage } from '../../pages/feedback.page';

// jb-feedback-history: the list with a reply, the empty list, the skeleton rows and the failed
// load.
parity('feedback-history', {
  cases: [
    {
      name: 'list',
      route: 'feedback',
      screen: (page) => new FeedbackPage(page),
      region: (screen: FeedbackPage) => screen.history,
    },
    {
      name: 'empty',
      route: 'feedback.history-empty',
      screen: (page) => new FeedbackPage(page),
      region: (screen: FeedbackPage) => screen.history,
    },
    {
      name: 'error',
      route: 'feedback.history-error',
      screen: (page) => new FeedbackPage(page),
      region: (screen: FeedbackPage) => screen.history,
    },
  ],
  reference: {
    absent:
      'The Feedback frame is not among the captured Magic Patterns frames yet. Each case is compared with the reference once the owner saves it as components/feedback-history/<case>-<width>.png (ADR 0060, docs/design-reference/magic-patterns/README.md).',
    nearestFrame: 'home-1280.png',
  },
});
