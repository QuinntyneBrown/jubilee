import { parity } from '../../fixtures/parity';
import { SignInPage } from '../../pages/sign-in.page';

// jb-google-mark: the "G" of Google, alone and in the button that carries it.
parity('google-mark', {
  cases: [
    {
      name: 'mark',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.googleMark,
    },
    {
      name: 'in-the-google-button',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.google,
    },
  ],
  reference: {
    crops: [
      {
        case: 'in-the-google-button',
        width: 1280,
        frame: 'log-in-1280.png',
        clip: { x: 647, y: 233, width: 520, height: 44 },
        knownDifference:
          'The reference draws the Google button 44 px tall with a 12 px gap, a grey edge of its own and 15 px Roboto; the design system draws the default button at --control-height-lg (48 px) with --space-2, --color-border-strong and the system text face.',
      },
    ],
  },
});
