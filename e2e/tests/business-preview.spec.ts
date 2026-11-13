import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/jb-test';
import { fulfil, recordedAnswer } from '../fixtures/mock-api';
import { BusinessPage } from '../pages/business.page';

// The preview of a listing that is not public (L2-219, L2-028 AC3): its owner and the Jubilee team
// may open it, and the page says that it is a preview and gives the status.

/** Answers Legacy Financial's page as the API does for a listing in this status. */
async function previewAs(
  page: Page,
  viewerRelation: 'owner' | 'moderator',
  status: string,
): Promise<void> {
  await page.route('**/api/listings/legacy-financial', async (route) => {
    const answer = await recordedAnswer(route);
    const listing = answer.body as Record<string, unknown>;
    const published = status === 'paused' || status === 'on-hold';
    const { verified: _verified, ...rest } = listing;
    await fulfil(route, {
      ...answer,
      body: { ...rest, viewerRelation, status, stage: published ? 'live' : status },
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
      'Draft · not published yet. Only you and the Jubilee team can open it.',
    );
    await expect(business.goToMyBusiness).toHaveAttribute('href', '/my-business');
    // The banner of a live listing is not shown with it
    await expect(business.main).not.toContainText('It’s live.');

    await expect(business.primaryAction).toHaveText('Edit listing');
    await expect(business.messageLink).toHaveCount(0);
    await expect(business.saveButton).toHaveCount(0);
    await expect(business.reportLink).toHaveCount(0);
    expect(views).toEqual([]);
  });

  test('AC7: the line above the name gives the category only, as on the public page', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.preview');

    await expect(business.kicker).toHaveText('Financial & insurance');
    await expect(business.categoryLink).toHaveAttribute('href', '/c/financial-insurance');
  });

  for (const [status, words] of [
    ['draft', 'Draft · not published yet'],
    ['paused', 'Paused · not public'],
    ['on-hold', 'On hold while we look into a report · not public'],
  ] as const) {
    test(`AC2: a listing that is ${status} reads "${words}"`, async ({ page, jb }) => {
      const business = new BusinessPage(page);
      await previewAs(page, 'owner', status);
      await jb.goto('/b/legacy-financial');

      await expect(business.previewBanner).toContainText(
        `${words}. Only you and the Jubilee team can open it.`,
      );
    });
  }

  test('AC3: the Jubilee team sees the status and none of the member actions', async ({
    page,
    jb,
  }) => {
    const views = countedViews(page);
    const business = new BusinessPage(page);
    await previewAs(page, 'moderator', 'draft');
    await jb.goto('/b/legacy-financial');

    await expect(business.previewBanner).toHaveRole('status');
    await expect(business.previewTitle).toHaveText('Preview: this listing is not public');
    await expect(business.previewBanner).toContainText(
      'Draft · not published yet. Only its owner and the Jubilee team can open it.',
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
    await expect(business.ownerBanner).toContainText('It’s live.');
    await expect(business.ownerBanner).not.toContainText('verified');
  });

  test('AC5: a member sees no preview banner on a public listing', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await jb.open('business');

    await expect(business.heading).toHaveText('Legacy Financial');
    await expect(business.previewBanner).toHaveCount(0);
  });
});
