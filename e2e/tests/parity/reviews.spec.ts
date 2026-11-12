import { type ParityWidth, parity } from '../../fixtures/parity';
import type { RouteKey } from '../../fixtures/routes';
import { BusinessPage } from '../../pages/business.page';

// jb-reviews: the section with reviews, empty, with the member's own review, as the owner sees
// it, loading, failed, and with the line of a member who may not write yet.
// At 360 px the empty state sits under the Deeks Insurance page, which is 283 px shorter in the
// app than in its mock and so puts the section on another fraction of a pixel; the section itself
// measures the same (215.8 px), so the empty state is compared at 1280 px only.
const states: [string, RouteKey, (readonly ParityWidth[])?][] = [
  ['default', 'business'],
  ['empty', 'business.reviews-empty', [1280]],
  ['mine', 'business.reviews-mine'],
  ['owner', 'business.reviews-owner'],
  ['loading', 'business.reviews-loading'],
  ['error', 'business.reviews-error'],
  ['not-eligible', 'business.reviews-not-eligible'],
];

parity('reviews', {
  cases: states.map(([name, route, widths]) => ({
    name,
    route,
    widths,
    screen: (page) => new BusinessPage(page),
    region: (screen: BusinessPage) => screen.reviews.root,
  })),
  reference: {
    crops: [
      {
        case: 'default',
        width: 1280,
        frame: 'listing-reviews-section-1280.png',
        clip: { x: 0, y: 0, width: 1280, height: 982 },
        knownDifference:
          'The frame draws 4.8 from 137 reviews, a home church under each name and a Helpful button on each review; the product shows the seeded sample, the date alone and Report (README, Reviews: what the product changes from the frames).',
      },
    ],
  },
});
