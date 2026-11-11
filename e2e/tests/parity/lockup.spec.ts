import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { ForgotPasswordPage } from '../../pages/forgot-password.page';
import { MarketingHomePage } from '../../pages/marketing-home.page';
import { SignInPage } from '../../pages/sign-in.page';

// jb-lockup: the brand link of the bare pages and of the top bar, the two larger sizes of Log in
// and Sign up, and the two smaller ones of the marketing site.
parity('lockup', {
  cases: [
    {
      name: 'default',
      route: 'forgot-password',
      screen: (page) => new ForgotPasswordPage(page),
      region: (screen: ForgotPasswordPage) => screen.frameBrand,
    },
    {
      name: 'top-bar',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.brand,
    },
    {
      name: 'marketing-bar',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.lockup,
    },
    {
      name: 'marketing-footer',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.footerLockup,
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
