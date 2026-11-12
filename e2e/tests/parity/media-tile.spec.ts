import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { BusinessPage } from '../../pages/business.page';

// jb-media-tile: the tinted tile of a business with its tag and the square tile of a product.
// The thumb beside a product's name is not compared: the mock gives each product its own icon
// and the recorded answers give them all the same one.
parity('media-tile', {
  cases: [
    {
      name: 'tagged',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.featuredCard(1).mediaTile,
    },
    {
      name: 'square',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.productCard(0).mediaTile,
    },
    {
      name: 'photo',
      route: 'business.photos',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.mediaTile,
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames show photos where the app draws tinted tiles; no frame shows a tile.',
    nearestFrame: 'home-1280.png',
  },
});
