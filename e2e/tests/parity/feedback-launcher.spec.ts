import { parity } from '../../fixtures/parity';
import { FeedbackLauncherScreen } from '../../pages/feedback.screens';

// jb-feedback-launcher: the round icon button of a phone and the pill of a desktop.
parity('feedback-launcher', {
  cases: [
    {
      name: 'launcher',
      route: 'browse.feedback-launcher',
      screen: (page) => new FeedbackLauncherScreen(page),
      region: (screen: FeedbackLauncherScreen) => screen.feedbackLauncher,
    },
  ],
  reference: {
    absent:
      'The Feedback frame is not among the captured Magic Patterns frames yet. Each case is compared with the reference once the owner saves it as components/feedback-launcher/<case>-<width>.png (ADR 0059, docs/design-reference/magic-patterns/README.md).',
    nearestFrame: 'home-1280.png',
  },
});
