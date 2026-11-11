import { parity } from '../../fixtures/parity';
import { ForgotPasswordPage } from '../../pages/forgot-password.page';
import { SignInPage } from '../../pages/sign-in.page';

// jb-lockup: the brand link of the bare pages, and the two larger sizes of Log in and Sign up.
parity('lockup', {
  cases: [
    {
      name: 'default',
      route: 'forgot-password',
      screen: (page) => new ForgotPasswordPage(page),
      region: (screen: ForgotPasswordPage) => screen.frameBrand,
    },
    {
      name: 'large',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.lockup,
      widths: [360],
    },
    {
      name: 'extra-large-on-ink',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.panelLockup,
      widths: [1280],
    },
  ],
  reference: {
    crops: [
      {
        case: 'large',
        width: 360,
        frame: 'log-in-360.png',
        clip: { x: 72, y: 40, width: 216, height: 53 },
      },
      {
        case: 'extra-large-on-ink',
        width: 1280,
        frame: 'log-in-1280.png',
        clip: { x: 64, y: 64, width: 233, height: 58 },
      },
    ],
  },
});
