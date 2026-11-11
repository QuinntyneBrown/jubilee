import { parity } from '../../fixtures/parity';
import { VerifyEmailPage } from '../../pages/verify-email.page';

// jb-spinner, large, while a link is checked.
parity('spinner', {
  cases: [
    {
      name: 'large',
      route: 'verify-email.loading',
      screen: (page) => new VerifyEmailPage(page),
      region: (screen: VerifyEmailPage) => screen.spinner,
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no spinner.',
    nearestFrame: 'home-1280.png',
  },
});
