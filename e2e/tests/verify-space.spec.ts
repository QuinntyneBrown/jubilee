import { LISTING_ID, SPACE_REVIEW as SPACE, stubAdmin } from '../fixtures/admin';
import { expect, test } from '../fixtures/jb-test';
import { AdminVerificationPage } from '../pages/admin-verification.page';

const REVIEW = `/verifications/${LISTING_ID}`;

test.describe('verify a space (L2-200)', () => {
  test('L2-200 AC3: the review of a space shows its terms and details and never its exact address', async ({
    page,
    jb,
  }) => {
    const review = new AdminVerificationPage(page);
    await review.setWidth(1280);
    await stubAdmin(page, { listing: SPACE });
    await jb.gotoAdmin(REVIEW);

    await expect(review.heading).toHaveText(SPACE.name);
    await expect(review.subtitle).toContainText('Rooms & rentals');
    await expect(review.spaceRow('Term')).toHaveText('Long term');
    await expect(review.spaceRow('Rent')).toHaveText('$1,850 per month');
    await expect(review.spaceRow('Available')).toHaveText('Dec 1');
    await expect(review.spaceRow('Minimum stay')).toHaveText('12-month lease');
    await expect(review.spaceRow('Neighbourhood')).toHaveText('The Annex');
    await expect(review.spaceRow('The space')).toHaveText('Basement apartment');
    await expect(review.spaceRow('Key facts')).toHaveText(
      '1 bedroom · 1 bath · 650 sq ft · Separate entrance',
    );
    await expect(review.spaceRow('What’s included')).toHaveText(
      'Utilities · Wi-Fi · Laundry · Private bath',
    );
    await expect(review.spaceRow('House rules')).toHaveText(
      'No smoking · Quiet after 10 pm · One small pet considered',
    );
    await expect(review.space).toContainText('The exact address is never shown here');
    await expect(review.spaceRow('Household')).toHaveCount(0);
    await expect(review.previewHeading).toHaveText('How renters see it');
    await expect(review.spacePreview).toContainText('$1,850');
    await expect(review.spacePreview).toContainText('Pending verification');
    await expect(review.preview).toHaveCount(0);
  });

  test('L2-200 AC3: the review of a room shows who lives there', async ({ page, jb }) => {
    const review = new AdminVerificationPage(page);
    await review.setWidth(1280);
    await stubAdmin(page, {
      listing: {
        ...SPACE,
        space: { ...SPACE.space, term: 'room', household: 'Two of us, both nurses.' },
      },
    });
    await jb.gotoAdmin(REVIEW);

    await expect(review.spaceRow('Term')).toHaveText('Room');
    await expect(review.spaceRow('Household')).toHaveText('Two of us, both nurses.');
  });
});
