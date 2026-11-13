import { parity } from '../../fixtures/parity';
import { FeedbackPage } from '../../pages/feedback.page';

// jb-score-rows with its four jb-score-row: the scale under the text on a phone, beside it on a
// desktop.
parity('score-rows', {
  cases: [
    {
      name: 'parts',
      route: 'feedback',
      screen: (page) => new FeedbackPage(page),
      region: (screen: FeedbackPage) => screen.scoreRows,
    },
  ],
  reference: {
    absent:
      'The Feedback frame is not among the captured Magic Patterns frames yet. Each case is compared with the reference once the owner saves it as components/score-rows/<case>-<width>.png (ADR 0060, docs/design-reference/magic-patterns/README.md).',
    nearestFrame: 'list-your-business-1280.png',
  },
});
