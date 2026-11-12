import { parity } from '../../fixtures/parity';
import { LaunchFormScreen } from '../../pages/marketing-home.page';

// jb-launch-confirmation: what takes the place of a launch form once it is sent.
parity('launch-confirmation', {
  cases: [
    {
      name: 'notify-paper',
      route: 'marketing-home.notify-success',
      screen: (page) => new LaunchFormScreen(page, 'notify', true),
      region: (screen: LaunchFormScreen) => screen.part.confirmation,
    },
    {
      name: 'business-surface',
      route: 'marketing-home.business-success',
      screen: (page) => new LaunchFormScreen(page, 'business', true),
      region: (screen: LaunchFormScreen) => screen.part.confirmation,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns design has no launching-soon frame (ADR 0044); the mocks are the source.',
    nearestFrame: 'list-your-business-1280.png',
  },
});
