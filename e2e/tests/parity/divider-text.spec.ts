import { parity } from '../../fixtures/parity';
import { SignInPage } from '../../pages/sign-in.page';

// jb-divider-text: "or use email", between the Google button and the form.
parity('divider-text', {
  cases: [
    {
      name: 'or-use-email',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.divider,
    },
  ],
  reference: {
    crops: [
      {
        case: 'or-use-email',
        width: 1280,
        frame: 'log-in-1280.png',
        clip: { x: 647, y: 297, width: 520, height: 20 },
        knownDifference:
          'The reference sets the words in Inter, between rules of ink at 10 %; the design system sets them in the system text face, between rules of --color-border-default.',
      },
    ],
  },
});
