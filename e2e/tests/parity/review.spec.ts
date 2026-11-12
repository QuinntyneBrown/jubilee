import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';

// jb-review: a member's view with the owner's reply and Report, one without a reply, the member's
// own review, and the owner's view with Edit reply.
parity('review', {
  cases: [
    {
      name: 'with-reply',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.review(0).root,
    },
    {
      name: 'plain',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.review(1).root,
    },
    {
      name: 'mine',
      route: 'business.reviews-mine',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.mine,
    },
    {
      name: 'owner',
      route: 'business.reviews-owner',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.review(0).root,
    },
  ],
  reference: {
    crops: [
      {
        case: 'with-reply',
        width: 1280,
        frame: 'listing-reviews-section-1280.png',
        clip: { x: 378, y: 132, width: 872, height: 272 },
        knownDifference:
          'The frame shows a home church and a relative date under the name and a Helpful button; the product shows the date alone and Report (README, Reviews: what the product changes from the frames).',
      },
    ],
  },
});
