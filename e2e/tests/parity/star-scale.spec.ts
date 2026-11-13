import { parity } from '../../fixtures/parity';
import { FeedbackPage } from '../../pages/feedback.page';
import {
  FeedbackPanelRateChosenScreen,
  FeedbackPanelScreen,
  FeedbackRateInvalidScreen,
} from '../../pages/feedback.screens';

// jb-star-scale: nothing chosen and four stars chosen in the panel; the page size, and the page
// size refused.
parity('star-scale', {
  cases: [
    {
      name: 'unrated',
      route: 'feedback-panel',
      screen: (page) => new FeedbackPanelScreen(page),
      region: (screen: FeedbackPanelScreen) => screen.panel.stars,
    },
    {
      name: 'rated',
      route: 'feedback-panel.rate-chosen',
      screen: (page) => new FeedbackPanelRateChosenScreen(page),
      region: (screen: FeedbackPanelRateChosenScreen) => screen.panel.stars,
    },
    {
      name: 'large',
      route: 'feedback',
      screen: (page) => new FeedbackPage(page),
      region: (screen: FeedbackPage) => screen.stars,
    },
    {
      name: 'large-invalid',
      route: 'feedback.rate-invalid',
      screen: (page) => new FeedbackRateInvalidScreen(page),
      region: (screen: FeedbackRateInvalidScreen) => screen.stars,
    },
  ],
  reference: {
    absent:
      'The Feedback frame is not among the captured Magic Patterns frames yet. Each case is compared with the reference once the owner saves it as components/star-scale/<case>-<width>.png (ADR 0060, docs/design-reference/magic-patterns/README.md).',
    nearestFrame: 'home-1280.png',
  },
});
