import { parity } from '../../fixtures/parity';
import { JoinPage } from '../../pages/join.page';
import { SignInPage } from '../../pages/sign-in.page';

// jb-checkbox: ticked, with its text, and with a sentence that holds links.
parity('checkbox', {
  cases: [
    {
      name: 'checked',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.keepSignedInChoice,
      arrange: (screen: SignInPage) => screen.keepAndLeave(),
    },
    {
      name: 'sentence-with-links',
      route: 'sign-up',
      screen: (page) => new JoinPage(page),
      region: (screen: JoinPage) => screen.agreementChoice,
      arrange: (screen: JoinPage) => screen.agreeAndLeave(),
    },
  ],
  reference: {
    crops: [
      {
        case: 'checked',
        width: 1280,
        frame: 'list-your-business-1280.png',
        clip: { x: 96, y: 1121, width: 560, height: 24 },
        knownDifference:
          "The reference checkbox is the browser's own, 16 px and green, with Inter 14 px text; the design system draws a 20 px box in the accent colour with the system text face at 16 px.",
      },
    ],
  },
});
