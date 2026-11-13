import { parity } from '../../fixtures/parity';
import { WriteReviewPage } from '../../pages/write-review.page';

const TEXT =
  'Trevor took the time to understand what we needed before suggesting anything. Clear, honest and no pressure. We’d go back.';

// jb-review-posted: the confirmation once a review is live, reached in the app by posting one.
parity('review-posted', {
  cases: [
    {
      name: 'default',
      route: 'write-review.posted',
      screen: (page) => new WriteReviewPage(page),
      region: (screen: WriteReviewPage) => screen.posted,
      arrange: async (screen: WriteReviewPage) => {
        await screen.rate(5);
        await screen.text.fill(TEXT);
        await screen.post.click();
        await screen.postedTitle.waitFor();
      },
    },
  ],
  reference: {
    absent:
      'The frames have no posted state; the mock draws it (README, Reviews: what the product changes from the frames).',
    nearestFrame: 'write-review-1280.png',
  },
});
