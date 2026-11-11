import { parity } from '../../fixtures/parity';
import { JoinPage } from '../../pages/join.page';
import { SignInPage } from '../../pages/sign-in.page';

// jb-field: the label alone, with its marker and hint, and with an error.
parity('field', {
  cases: [
    {
      name: 'label',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.fieldOf('Password'),
      arrange: (screen: SignInPage) => screen.typeAndLeave(screen.password, 'longpassword1'),
    },
    {
      name: 'required-with-hint',
      route: 'sign-up',
      screen: (page) => new JoinPage(page),
      region: (screen: JoinPage) => screen.fieldOf('Password'),
      arrange: (screen: JoinPage) => screen.typeAndLeave(screen.password, 'longpassword1'),
    },
    {
      name: 'error',
      route: 'sign-in.invalid',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.fieldOf('E-mail'),
      arrange: (screen: SignInPage) => screen.sendInvalidEmail('joanna.adeyemi@', 'longpassword1'),
    },
  ],
  reference: {
    crops: [
      {
        case: 'label',
        width: 1280,
        frame: 'list-your-business-1280.png',
        clip: { x: 96, y: 388, width: 705, height: 80 },
        knownDifference:
          'The reference field is 50 px tall with a 12 px radius, a 12 px gap under the label and Inter; the design system field is 44 px tall (--control-height-md) with --radius-md, a --space-1 gap and the system text face.',
      },
    ],
  },
});
