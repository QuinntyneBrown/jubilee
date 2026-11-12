import { parity } from '../../fixtures/parity';
import { LaunchFormScreen, MarketingHomePage } from '../../pages/marketing-home.page';

// jb-marketing-button: the link of the opening, the pill of the top bar, gold on the ink band,
// and the button of a form at rest and busy.
parity('marketing-button', {
  cases: [
    {
      name: 'link',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.tellMe,
    },
    {
      name: 'pill',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.launchingSoon,
    },
    {
      name: 'gold',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.sendDetails,
    },
    {
      name: 'submit',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.notifyForm.send,
    },
    {
      name: 'busy',
      route: 'marketing-home.notify-busy',
      screen: (page) => new LaunchFormScreen(page, 'notify', true),
      region: (screen: LaunchFormScreen) => screen.notifyForm.send,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames are of the app; none shows the marketing site.',
    nearestFrame: 'home-1280.png',
  },
});
