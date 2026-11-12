import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-icon where the marketing site's hand-drawn arrows were: the arrow of a button, of the top
// bar's pill and the smaller one of the link that points down the page. While Jubilee is launching
// soon every arrow points down the page (L2-215 AC6). The other icons the site uses
// (search, verified, message, play) are in the specs of the components that draw them.
parity('icon', {
  cases: [
    {
      name: 'arrow-down-button',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.tellMe,
    },
    {
      name: 'arrow-down-pill',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.launchingSoon,
    },
    {
      name: 'arrow-down-link',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.watchTheFilm,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames are of the app; none shows the marketing site.',
    nearestFrame: 'home-1280.png',
  },
});
