import { parity } from '../../fixtures/parity';
import { FeedbackPage } from '../../pages/feedback.page';
import { FeedbackBugScreenshotsScreen } from '../../pages/feedback.screens';

// jb-file-list: the button alone, and with two files chosen.
parity('file-list', {
  cases: [
    {
      name: 'no-files',
      route: 'feedback.bug',
      screen: (page) => new FeedbackPage(page),
      region: (screen: FeedbackPage) => screen.screenshots,
    },
    {
      name: 'two-files',
      route: 'feedback.bug-screenshots',
      screen: (page) => new FeedbackBugScreenshotsScreen(page),
      region: (screen: FeedbackBugScreenshotsScreen) => screen.screenshots,
    },
  ],
  reference: {
    absent:
      'The Feedback frame is not among the captured Magic Patterns frames yet; the owner exports it (docs/design-reference/magic-patterns/README.md).',
    nearestFrame: 'list-your-business-1280.png',
  },
});
