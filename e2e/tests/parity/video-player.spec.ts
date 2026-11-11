import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-video-player on the marketing site: the still with its play button and length over the
// chapters, and the chapters once the visitor has chosen the second one.
parity('video-player', {
  cases: [
    {
      name: 'still',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.player,
    },
    {
      name: 'chapter-chosen',
      route: 'marketing-home.playing',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.chapterList,
      arrange: (screen: MarketingHomePage) =>
        screen.chapter('Finding someone you can trust').click(),
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames are of the app; none shows the marketing site.',
    nearestFrame: 'home-1280.png',
  },
});
