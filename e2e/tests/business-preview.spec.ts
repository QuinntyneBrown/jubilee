import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/jb-test';
import { fulfil, recordedAnswer } from '../fixtures/mock-api';
import { BusinessPage } from '../pages/business.page';

// The preview of a listing that is not public (L2-219, L2-028 AC3): its owner and the verification
// team may open it, and the page says that it is a preview and gives the status.

/** Answers Legacy Financial's page as the API does for a listing in this status. */
async function previewAs(
  page: Page,
  viewerRelation: 'owner' | 'verifier',
  status: string,
): Promise<void> {
  await page.route('**/api/listings/legacy-financial', async (route) => {
    const answer = await recordedAnswer(route);
    const listing = answer.body as Record<string, unknown>;
    const approved = status === 'paused' || status === 'on-hold';
    await fulfil(route, {
      ...answer,
      body: {
        ...listing,
        viewerRelation,
        status,
        stage: approved ? 'live' : status,
        verified: approved,
      },
    });
  });
}

/** The listing views the page asks the API to count. */
function countedViews(page: Page): string[] {
  const views: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/views')) views.push(request.url());
  });
  return views;
}

test.describe('preview of a listing that is not public (L2-219)', () => {
  test('AC1 and AC4: the owner sees that it is a preview, with the status and "Edit listing"', async ({
    page,
    jb,
  }) => {
    const views = countedViews(page);
    const business = new BusinessPage(page);
    await jb.open('business.preview');

    await expect(business.previewBanner).toHaveRole('status');
    await expect(business.previewTitle).toHaveText('Preview: members can’t see this page yet');
    await expect(business.previewBanner).toContainText(
      'Changes requested · not public yet. Only you and the Jubilee verification team can open it.',
    );
    await expect(business.goToMyBusiness).toHaveAttribute('href', '/my-business');
    // The banner of a live listing is not shown with it
    await expect(business.main).not.toContainText('It’s live and verified.');

    await expect(business.primaryAction).toHaveText('Edit listing');
    await expect(business.messageLink).toHaveCount(0);
    await expect(business.saveButton).toHaveCount(0);
    await expect(business.reportLink).toHaveCount(0);
    expect(views).toEqual([]);
  });

  test('AC7: a listing that is not verified does not say "Verified Christian business"', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.preview');

    await expect(business.kicker).toHaveText('Financial & insurance');
    await expect(business.verifiedLabel).toHaveCount(0);
    await expect(business.categoryLink).toHaveAttribute('href', '/c/financial-insurance');
  });

  for (const [status, words] of [
    ['draft', 'Draft · not submitted yet'],
    ['ready-to-review', 'Pending verification'],
    ['changes-requested', 'Changes requested · not public yet'],
    ['declined', 'Declined · not public'],
    ['paused', 'Verified · paused, not public'],
    ['on-hold', 'On hold while we look into a report · not public'],
  ] as const) {
    test(`AC2: a listing that is ${status} reads "${words}"`, async ({ page, jb }) => {
      const business = new BusinessPage(page);
      await previewAs(page, 'owner', status);
      await jb.goto('/b/legacy-financial');

      await expect(business.previewBanner).toContainText(
        `${words}. Only you and the Jubilee verification team can open it.`,
      );
    });
  }

  test('AC3: the verification team sees the status and none of the member actions', async ({
    page,
    jb,
  }) => {
    const views = countedViews(page);
    const business = new BusinessPage(page);
    await previewAs(page, 'verifier', 'ready-to-review');
    await jb.goto('/b/legacy-financial');

    await expect(business.previewBanner).toHaveRole('status');
    await expect(business.previewTitle).toHaveText('Preview: this listing is not public');
    await expect(business.previewBanner).toContainText(
      'Pending verification. Only its owner and the Jubilee verification team can open it.',
    );
    await expect(business.goToMyBusiness).toHaveCount(0);
    await expect(business.heading).toHaveText('Legacy Financial');
    await expect(business.actions.getByRole('link')).toHaveCount(0);
    await expect(business.actions.getByRole('button')).toHaveCount(0);
    await expect(business.reportLink).toHaveCount(0);
    // The services are still listed, as members would see them
    await expect(business.serviceRow(0).title).toHaveText('Discovery meeting');
    expect(views).toEqual([]);
  });

  test('AC5: a public listing shows no preview banner, to its owner or to a member', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.owner');
    await expect(business.heading).toHaveText('Legacy Financial');
    await expect(business.previewBanner).toHaveCount(0);
    await expect(business.ownerBanner).toContainText('It’s live and verified.');
  });

  test('AC5: a member sees no preview banner on a public listing', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await jb.open('business');

    await expect(business.heading).toHaveText('Legacy Financial');
    await expect(business.previewBanner).toHaveCount(0);
  });
});
