import { parity } from '../../fixtures/parity';
import { SignInPage } from '../../pages/sign-in.page';

// jb-password-input: the control with the button that shows what was typed, at rest.
parity('password-input', {
  cases: [
    {
      name: 'hidden',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.passwordControl,
      arrange: (screen: SignInPage) => screen.typeAndLeave(screen.password, 'longpassword1'),
    },
  ],
  reference: {
    crops: [
      {
        case: 'hidden',
        width: 1280,
        frame: 'log-in-1280.png',
        clip: { x: 647, y: 462, width: 520, height: 44 },
        knownDifference:
          'The reference control has a 12 px radius, an edge of ink at 20 %, an 18 px eye and no value typed; the design system control has --radius-md, --color-border-strong and a 20 px eye, and the mock shows a value.',
      },
    ],
  },
});
