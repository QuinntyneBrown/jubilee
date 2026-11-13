import { expect, test, themes } from '../fixtures/jb-test';
import { patchListing } from '../fixtures/stubs';
import { BusinessPage } from '../pages/business.page';
import { NotFoundPage } from '../pages/not-found.page';

// Service business page: L2-033, L2-028, L2-040, L2-088, L2-111 and L2-118.
// "business" is /b/legacy-financial against the recorded answers of the seeded API (ADR 0009).

test.describe('service business page (L2-033)', () => {
  test('AC1: it shows the header, actions, highlight, services, About, Details, related and report', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await business.setWidth(1280);
    await jb.open('business');
    await expect.poll(() => business.dataPage()).toBe('business');
    await expect(page).toHaveTitle('Legacy Financial · Jubilee');

    await expect(business.backLink).toHaveText('Back to browse');
    await expect(business.backLink).toHaveAttribute('href', '/');
    await expect(business.kicker).toHaveText('Financial & insurance');
    await expect(business.categoryLink).toHaveAttribute('href', '/c/financial-insurance');
    await expect(business.heading).toHaveText('Legacy Financial');
    await expect(business.ownerName).toHaveText('Trevor Chew, CKA®, CFP®, CLU®');
    await expect(business.tagline).toHaveText('Build a Legacy. Protect a Legacy. Leave a Legacy.');
    await expect(business.credentialTags).toHaveText(['CKA® · CFP® · CLU®']);

    await expect(business.primaryAction).toHaveText('Book a meeting');
    await expect(business.primaryAction).toHaveAttribute('href', '/b/legacy-financial/book');
    await expect(business.messageLink).toHaveAttribute('href', '/b/legacy-financial/message');
    await expect(business.saveButton).toHaveAttribute('aria-pressed', 'false');
    await expect(business.shareLink).toHaveAttribute('href', '/b/legacy-financial/share');
    await expect(business.highlight).toHaveText('Free first meeting');

    await expect(business.serviceRows).toHaveCount(4);
    await expect(business.about).toContainText(
      'Financial planning grounded in biblical stewardship',
    );
    await expect(business.detailTerms).toHaveText([
      'Where',
      'Hours',
      'Languages',
      'On Jubilee since',
      'Replies',
    ]);
    await expect(business.detailValues).toHaveText([
      '2 Sheppard Ave E, North York · video across Ontario',
      'Mon–Fri 9:00–5:00 · Thu until 8:00',
      'English, Cantonese',
      'March 2026',
      'Usually within a day',
    ]);
    await expect(business.related.getByRole('heading', { level: 2 })).toHaveText(
      'More in Financial & insurance',
    );
    await expect(business.reportLink).toHaveAttribute('href', '/b/legacy-financial/report');
  });

  test('AC2: each service row has name, detail, price and an action for that service', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business');

    const discovery = business.serviceRow(0);
    await expect(discovery.title).toHaveText('Discovery meeting');
    await expect(discovery.detail).toHaveText('30 min · In person or video');
    await expect(discovery.price).toHaveText('Free');
    await expect(discovery.action).toHaveText('Book');
    await expect(discovery.action).toHaveAccessibleName('Book Discovery meeting');
    await expect(discovery.action).toHaveAttribute(
      'href',
      /^\/b\/legacy-financial\/book\?service=[0-9a-f-]{36}$/,
    );
    await expect(business.serviceRow(1).price).toHaveText('Ask');
    await expect(business.serviceRows.locator('.row__price')).toHaveText([
      'Free',
      'Ask',
      'Free',
      'Ask',
    ]);
  });

  test('AC2: an "Ask" service opens the quote request and an amount is shown in dollars', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.edge');

    const training = business.serviceRow(5);
    await expect(training.title).toHaveText('Church and ministry treasurer training');
    await expect(training.price).toHaveText('$1,250');

    await patchListing(page, '**/api/listings/legacy-financial', (listing) => ({
      ...listing,
      services: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Will review',
          detail: '45 min',
          priceKind: 'ask',
          priceCents: null,
          action: 'ask',
        },
      ],
    }));
    await page.reload();
    await expect(business.serviceRow(0).action).toHaveText('Ask');
    await expect(business.serviceRow(0).action).toHaveAccessibleName('Ask Will review');
    await expect(business.serviceRow(0).action).toHaveAttribute(
      'href',
      '/b/legacy-financial/quote?service=00000000-0000-0000-0000-000000000001',
    );
  });

  test('AC3: ten services are all listed, credentials wrap as tags and the name wraps', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await business.setWidth(360);
    await jb.open('business.edge');

    await expect(business.serviceRows).toHaveCount(10);
    await expect(business.credentialTags).toHaveCount(8);
    await expect(business.heading).toHaveText(
      'Legacy Financial Planning, Insurance and Estate Advisory Services of Greater Toronto and Durham Region',
    );
    expect(await business.headingIsTruncated()).toBe(false);
    expect(await business.overflowsHorizontally()).toBe(false);
  });

  test('AC4: a business without services says so and offers "Send a message"', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.empty');

    await expect(business.servicesEmpty.getByRole('heading')).toHaveText('No services listed yet');
    await expect(business.servicesEmpty).toContainText(
      'Legacy Financial is new on Jubilee and hasn’t added services. You can still message them to ask what they offer.',
    );
    await expect(business.emptyAction('Send a message')).toHaveAttribute(
      'href',
      '/b/legacy-financial/message',
    );
    await expect(business.primaryAction).toHaveText('Send a message');
    await expect(business.highlight).toHaveCount(0);
  });

  test('AC5: "Replies" is left out when there are too few replies to say', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await patchListing(page, '**/api/listings/legacy-financial', (listing) => ({
      ...listing,
      details: { ...(listing['details'] as object), replies: null },
    }));
    await jb.open('business');

    await expect(business.detailTerms).toHaveText([
      'Where',
      'Hours',
      'Languages',
      'On Jubilee since',
    ]);
  });

  test('AC6 and L2-118: a failed load names the business, quotes JB-BIZ-503 and tries again', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.error');

    await expect(business.errorState.getByRole('heading', { level: 1 })).toHaveText(
      'We couldn’t load this business',
    );
    await expect(business.errorState).toContainText(
      'Nothing is lost. Check your connection and try again. If it keeps happening, tell us and quote JB-BIZ-503.',
    );
    await expect(business.errorReference).toHaveText('JB-BIZ-503');
    await expect(business.errorBackToBrowse).toHaveAttribute('href', '/');

    // When the service is back, "Try again" loads the business
    await page.unroute('**/api/listings/legacy-financial');
    await business.tryAgain.click();
    await expect(business.heading).toHaveText('Legacy Financial');
  });

  test('loading: the page announces it is loading and shows the skeleton', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await jb.open('business.loading');

    await expect(business.loadingStatus).toHaveText('Loading this business…');
    await expect(business.skeletons.first()).toBeVisible();
    await expect(business.backLink).toBeVisible();
  });
});

test.describe('who sees a listing (L2-028)', () => {
  test('AC3: a listing that is not public shows the not-found page at its own address', async ({
    page,
    jb,
  }) => {
    const notFound = new NotFoundPage(page);
    // Given the seeded Bethel Gift Baskets, paused by its owner
    const answer = page.waitForResponse('**/api/listings/bethel-gift-baskets');
    await jb.goto('/b/bethel-gift-baskets');

    expect((await answer).status()).toBe(404);
    await expect(notFound.heading).toHaveText('We can’t find that page');
    await expect(page).toHaveURL(/\/b\/bethel-gift-baskets$/);
  });
});

test.describe('no verified claim, and the photo (ADR 0057, L2-088)', () => {
  test('ADR 0057: the page calls the business neither verified nor checked', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business');

    await expect(business.kicker).not.toContainText('Verified');
    await expect(business.main.getByRole('link', { name: /verified/i })).toHaveCount(0);
  });

  test('L2-088 AC6: a business without photos shows its category tile', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    await jb.open('business');

    await expect(business.mediaTile).toHaveClass(/media--green/);
    await expect(business.mediaLabel).toHaveText('Financial');
  });
});

test.describe('related businesses (L2-040)', () => {
  test('AC1: up to two other live businesses of the category, and "See all"', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business');

    await expect(business.relatedCards).toHaveCount(2);
    await expect(business.relatedCard(0).name).toHaveText('Deeks Insurance');
    await expect(business.relatedCard(0).root).toHaveAttribute('href', '/b/deeks-insurance');
    await expect(business.relatedCard(0).root).not.toContainText('Verified');
    await expect(business.relatedCard(1).name).toHaveText('JD Smith Insurance Brokers');
    await expect(business.seeAll).toHaveAttribute('href', '/c/financial-insurance');

    // A related business opens its own page
    await business.relatedCard(0).root.click();
    await expect(business.heading).toHaveText('Deeks Insurance');
    await expect(page).toHaveURL(/\/b\/deeks-insurance$/);
  });

  test('AC2: the section is left out when no other business of the category is live', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await patchListing(page, '**/api/listings/legacy-financial', (listing) => ({
      ...listing,
      related: [],
    }));
    await jb.open('business');

    await expect(business.heading).toHaveText('Legacy Financial');
    await expect(business.related).toHaveCount(0);
  });
});

test.describe('the "Replies fast" badge (L2-054)', () => {
  for (const theme of themes) {
    test(`AC1: a business that answers within a day says so on its page and on its card, in words (${theme})`, async ({
      page,
      jb,
    }) => {
      const business = new BusinessPage(page);
      await business.setWidth(1280);
      await jb.open('business.replies-fast', { theme });

      await expect(business.heading).toHaveText('Legacy Financial');
      await expect(business.repliesFast).toHaveText('Replies fast');
      await expect(business.repliesFast).toBeVisible();
      await expect(business.relatedCard(0).name).toHaveText('Deeks Insurance');
      await expect(business.relatedCard(0).repliesFast).toHaveText('Replies fast');
      await expect(business.relatedCard(0).repliesFast).toBeVisible();
    });
  }

  test('AC1: the badge fits beside the credentials and on the card on a phone', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await business.setWidth(360);
    await jb.open('business.replies-fast');

    await expect(business.repliesFast).toBeInViewport();
    await business.relatedCard(0).root.scrollIntoViewIfNeeded();
    await expect(business.relatedCard(0).repliesFast).toBeInViewport();
    expect(await business.overflowsHorizontally()).toBe(false);
  });

  test('AC3: a business without the badge shows nothing in its place, on its page or on a card', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await business.setWidth(1280);
    await jb.open('business');

    await expect(business.heading).toHaveText('Legacy Financial');
    await expect(business.credentialTags).toHaveText(['CKA® · CFP® · CLU®']);
    await expect(business.repliesFast).toHaveCount(0);
    await expect(business.relatedCards).toHaveCount(2);
    await expect(business.relatedCard(0).repliesFast).toHaveCount(0);
    await expect(business.relatedCard(1).repliesFast).toHaveCount(0);
  });
});
