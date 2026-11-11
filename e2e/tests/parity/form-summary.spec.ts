import { parity } from '../../fixtures/parity';
import { ForgotPasswordPage } from '../../pages/forgot-password.page';

// jb-form-summary: the danger alert that lists what to fix, at rest.
parity('form-summary', {
  cases: [
    {
      name: 'one-error',
      route: 'forgot-password.invalid',
      screen: (page) => new ForgotPasswordPage(page),
      region: (screen: ForgotPasswordPage) => screen.summary,
      arrange: (screen: ForgotPasswordPage) => screen.sendEmpty(),
    },
  ],
  reference: {
    absent: 'The Magic Patterns design shows no form with errors.',
    nearestFrame: 'list-your-business-1280.png',
  },
});
