import { parity } from '../../fixtures/parity';
import { ForgotPasswordPage } from '../../pages/forgot-password.page';
import { JoinSuccessScreen } from '../../pages/join.page';
import { SessionExpiredPage, SignInErrorScreen, SignInPage } from '../../pages/sign-in.page';

// jb-auth-layout: the centred card of the bare pages, and the split frame of Log in and Sign up
// with its brand panel, its card under 1024 px and the link under the form (jb-auth-link).
parity('auth-layout', {
  cases: [
    {
      name: 'card',
      route: 'session-expired',
      screen: (page) => new SessionExpiredPage(page),
      region: (screen: SessionExpiredPage) => screen.frameCard,
    },
    {
      name: 'line-under-the-card',
      route: 'forgot-password',
      screen: (page) => new ForgotPasswordPage(page),
      region: (screen: ForgotPasswordPage) => screen.frameFoot,
    },
    {
      name: 'split-panel',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.brandPanel,
      widths: [1280],
    },
    {
      name: 'split-headline',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.panelHeadline,
      widths: [1280],
    },
    {
      name: 'split-card',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.card,
      arrange: (screen: SignInPage) => screen.fillAsDrawn(),
    },
    {
      name: 'split-link',
      route: 'sign-in',
      screen: (page) => new SignInPage(page),
      region: (screen: SignInPage) => screen.frameFoot,
    },
    {
      name: 'split-error-state',
      route: 'sign-in.error',
      screen: (page) => new SignInErrorScreen(page),
      region: (screen: SignInErrorScreen) => screen.card,
    },
    {
      name: 'split-success-state',
      route: 'sign-up.success',
      screen: (page) => new JoinSuccessScreen(page),
      region: (screen: JoinSuccessScreen) => screen.frameCard,
    },
  ],
  reference: {
    crops: [
      {
        case: 'split-headline',
        width: 1280,
        frame: 'log-in-1280.png',
        clip: { x: 64, y: 302, width: 405, height: 155 },
        knownDifference:
          'The reference sets the headline of the panel at a line height of 1.08 with −0.02em tracking; the design system sets its display style at --line-height-tight (1.2) with --letter-spacing-tight.',
      },
      {
        case: 'split-link',
        width: 1280,
        frame: 'log-in-1280.png',
        clip: { x: 770, y: 644, width: 274, height: 23 },
        knownDifference:
          'The reference sets the line under the form at 15 px in Inter; the design system sets it at --text-body-sm (14 px) in the system text face.',
      },
    ],
  },
});
