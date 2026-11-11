import { parity } from '../../fixtures/parity';
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
      route: 'sign-in.invalid',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.email,
      arrange: (screen: SignInPage) => screen.sendInvalidEmail('joanna.adeyemi@', 'longpassword1'),
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
