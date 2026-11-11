import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-icon where the marketing site's hand-drawn arrows were: the arrow of a button, of a link
// and the smaller one of the link that points down the page. The other icons the site uses
// (search, verified, message, play) are in the specs of the components that draw them.
parity('icon', {
  cases: [
    {
      name: 'arrow-up-right-button',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.startBrowsing,
    },
    {
      name: 'arrow-up-right-link',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.seeAll,
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
