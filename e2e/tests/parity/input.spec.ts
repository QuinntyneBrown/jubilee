import { parity } from '../../fixtures/parity';
import { ForgotPasswordPage } from '../../pages/forgot-password.page';
import { SignInPage } from '../../pages/sign-in.page';

// jb-input: at rest with a value, and refused.
parity('input', {
  cases: [
    {
      name: 'value',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.password,
      arrange: (screen: SignInPage) => screen.typeAndLeave(screen.password, 'longpassword1'),
    },
    {
      name: 'invalid',
      route: 'forgot-password.invalid',
      screen: (page) => new ForgotPasswordPage(page),
      region: (screen: ForgotPasswordPage) => screen.email,
      arrange: (screen: ForgotPasswordPage) => screen.sendMalformedAndReturn('joanna.adeyemi'),
    },
  ],
  reference: {
    crops: [
      {
        case: 'value',
        width: 1280,
        frame: 'list-your-business-1280.png',
        clip: { x: 96, y: 547, width: 705, height: 50 },
        knownDifference:
          'The reference control is 50 px tall with a 12 px radius and Inter; the design system control is 44 px tall (--control-height-md) with --radius-md and the system text face.',
      },
    ],
  },
});
