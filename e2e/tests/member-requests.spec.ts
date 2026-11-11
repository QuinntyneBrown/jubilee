import { expect, test } from '../fixtures/jb-test';
import {
  DRAIN,
  FLOWERS,
  MEETING,
  seedRequests,
  stubMemberRequests,
} from '../fixtures/member-requests';
import { CancelRequestDialog } from '../pages/cancel-request.dialog';
import { RequestDetailPage } from '../pages/request-detail.page';
import { RequestsPage } from '../pages/requests.page';
import { Toasts } from '../pages/toasts';

test.describe('track requests: the list (L2-047)', () => {
  test('L2-047 AC1: the page says how many are open and awaiting and offers the five tabs', async ({
    page,
    jb,
  }) => {
    const requests = new RequestsPage(page);
    await requests.setWidth(1280);
    await stubMemberRequests(page);
    await jb.goto('/requests');

    await expect(requests.heading).toHaveText('Your requests');
    await expect(requests.subtitle).toHaveText('3 open · 1 awaiting reply');
    await expect(requests.typeTab(/^All/)).toHaveAttribute('aria-selected', 'true');
    await expect(requests.typeTab(/^All/)).toContainText('4');
    await expect(requests.typeTab(/^Bookings/)).toContainText('1');
    await expect(requests.typeTab(/^Quotes/)).toContainText('1');
    await expect(requests.typeTab(/^Orders/)).toContainText('2');
    await expect(requests.typeTab(/^Declined/)).toContainText('0');
  });

  test('L2-047 AC2: each row has a title, the type and business, a detail line and a status', async ({
    page,
    jb,
  }) => {
    const requests = new RequestsPage(page);
    await requests.setWidth(1280);
    await stubMemberRequests(page);
    await jb.goto('/requests');

    await expect(requests.rows).toHaveCount(4);
    const meeting = requests.row('Discovery meeting');
    await expect(meeting).toContainText('Booking · Legacy Financial');
    await expect(meeting).toContainText('Thu 12 Nov, 10:00 a.m. · Video');
    await expect(meeting).toContainText('Confirmed');
    const drain = requests.row('Kitchen drain');
    await expect(drain).toContainText('Quote · WaterWorks Plumbing & Drains');
    await expect(drain).toContainText('Sent ');
    await expect(drain).toContainText('Awaiting reply');
    await expect(requests.row('Leather journaling Bible')).toContainText(
      'Pickup Fri 13 Nov · $64.00 + tax',
    );
    await expect(requests.row('Autumn table')).toContainText('Completed');
  });

  test('L2-047 AC3: open requests come before closed ones', async ({ page, jb }) => {
    const requests = new RequestsPage(page);
    await requests.setWidth(1280);
    await stubMemberRequests(page);
    await jb.goto('/requests');

    await expect(requests.rows.last()).toContainText('Autumn table arrangement');
  });

  test('L2-047 AC4: a tab with no rows says so and goes back to all requests', async ({
    page,
    jb,
  }) => {
    const requests = new RequestsPage(page);
    await requests.setWidth(1280);
    await stubMemberRequests(page);
    await jb.goto('/requests');

    await requests.typeTab(/^Declined/).click();

    await expect(requests.typeTab(/^Declined/)).toHaveAttribute('aria-selected', 'true');
    await expect(requests.empty).toContainText('No declined requests');
    await expect(requests.empty).toContainText(
      'Every business you’ve asked has said yes, or is still deciding.',
    );
    await requests.empty.getByRole('button', { name: 'Show all requests' }).click();
    await expect(requests.rows).toHaveCount(4);
  });

  test('L2-047 AC5: with no requests at all the page invites the member to browse', async ({
    page,
    jb,
  }) => {
    const requests = new RequestsPage(page);
    await requests.setWidth(1280);
    await stubMemberRequests(page, { requests: [] });
    await jb.goto('/requests');

    await expect(requests.subtitle).toHaveText('Nothing requested yet');
    await expect(requests.empty).toContainText('Book, ask or order to get started');
    await expect(requests.browse).toBeVisible();
  });

  test('L2-047 AC6: the list loads 20 at a time with Show more', async ({ page, jb }) => {
    const requests = new RequestsPage(page);
    await requests.setWidth(1280);
    const many = Array.from({ length: 26 }, (_, i) => ({
      ...seedRequests()[0],
      id: `7a1e0000-0000-4000-8000-0000000002${String(i).padStart(2, '0')}`,
      title: `Candle ${String(i).padStart(2, '0')}`,
    }));
    await stubMemberRequests(page, { requests: many });
    await jb.goto('/requests');

    await expect(requests.rows).toHaveCount(20);
    await requests.showMore.click();
    await expect(requests.rows).toHaveCount(26);
    await expect(requests.showMore).toHaveCount(0);
  });

  test('L2-118: when the list cannot load, the page quotes its reference and tries again', async ({
    page,
    jb,
  }) => {
    const requests = new RequestsPage(page);
    await requests.setWidth(1280);
    const fake = await stubMemberRequests(page, { list: 'fails' });
    await jb.goto('/requests');

    await expect(requests.alert).toContainText('We couldn’t load your requests');
    await expect(requests.reference).toHaveText('JB-REQ-501');
    fake.list = 'ok';
    await requests.tryAgain.click();
    await expect(requests.rows).toHaveCount(4);
  });

  test('L2-070: a request the owner answers while the page is open changes status with a toast', async ({
    page,
    jb,
  }) => {
    const requests = new RequestsPage(page);
    const toasts = new Toasts(page);
    await requests.setWidth(1280);
    const fake = await stubMemberRequests(page);
    await jb.goto('/requests');
    await expect(requests.row('Kitchen drain')).toContainText('Awaiting reply');

    fake.answer(DRAIN, 'confirmed');

    await expect(requests.row('Kitchen drain')).toContainText('Confirmed', { timeout: 10_000 });
    await expect(
      toasts.withTitle('WaterWorks Plumbing & Drains confirmed your quote request'),
    ).toBeVisible();
  });

  test('a row opens its request', async ({ page, jb }) => {
    const requests = new RequestsPage(page);
    const detail = new RequestDetailPage(page);
    await requests.setWidth(1280);
    await stubMemberRequests(page);
    await jb.goto('/requests');

    await requests.titleLink('Kitchen drain is slow and gurgling').click();

    await expect(detail.heading).toHaveText('Kitchen drain is slow and gurgling');
  });
});

test.describe('track requests: the detail (L2-048)', () => {
  test('L2-048 AC1: a quote awaiting reply shows the callout, the details, Message, Cancel and the progress', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    await detail.setWidth(1280);
    await stubMemberRequests(page);
    await jb.goto(`/requests/${DRAIN}`);

    await expect(detail.heading).toHaveText('Kitchen drain is slow and gurgling');
    await expect(detail.subtitle).toContainText(
      'Quote · WaterWorks Plumbing & Drains · Awaiting reply',
    );
    await expect(detail.callout).toContainText('Waiting for WaterWorks Plumbing & Drains to reply');
    await expect(detail.callout).toContainText(
      'They usually answer within a day. We’ll notify you the moment they do.',
    );
    await expect(detail.details).toContainText('What you need');
    await expect(detail.details).toContainText('Message on Jubilee, or 416-555-0142');
    await expect(detail.message).toBeVisible();
    await expect(detail.cancel).toHaveText(/Cancel request/);
    await expect(detail.steps).toHaveCount(3);
    await expect(detail.steps.nth(0)).toContainText('You asked');
    await expect(detail.steps.nth(1)).toHaveAttribute('aria-current', 'step');
  });

  test('L2-048 AC2: a confirmed booking says who confirmed and offers Add to calendar', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    await detail.setWidth(1280);
    await stubMemberRequests(page);
    await jb.goto(`/requests/${MEETING}`);

    await expect(detail.callout).toContainText('Trevor confirmed your meeting');
    await expect(detail.callout).toContainText(
      'Thu 12 Nov, 10:00–10:30 a.m. by video. The link is in your messages and we’ll remind you an hour before.',
    );
    await expect(detail.addToCalendar).toHaveAttribute(
      'href',
      `/api/requests/${MEETING}/calendar.ics`,
    );
    await expect(detail.cancel).toHaveText(/Cancel booking/);
  });

  test('L2-048 AC3: a declined request shows the business’s message and where to find others', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    await detail.setWidth(1280);
    const fake = await stubMemberRequests(page);
    fake.requests.find((r) => r.id === DRAIN)!.declineMessage =
      'We’re booked solid until December.';
    fake.answer(DRAIN, 'declined');
    await jb.goto(`/requests/${DRAIN}`);

    await expect(detail.callout).toContainText('WaterWorks Plumbing & Drains can’t take this job');
    await expect(detail.callout).toContainText('“We’re booked solid until December.”');
    await expect(detail.seeOthers).toHaveAttribute('href', '/c/home-property');
    await expect(detail.cancel).toHaveCount(0);
  });

  test('L2-048 AC4: a cancelled request says so and offers nothing but Message and Ask again', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    await detail.setWidth(1280);
    const fake = await stubMemberRequests(page);
    fake.answer(DRAIN, 'cancelled');
    await jb.goto(`/requests/${DRAIN}`);

    await expect(detail.callout).toContainText('You cancelled this request');
    await expect(detail.callout).toContainText(
      'WaterWorks Plumbing & Drains has been told. Nothing more will happen with it.',
    );
    await expect(detail.cancel).toHaveCount(0);
    await expect(detail.message).toBeVisible();
    await expect(detail.askAgain).toBeVisible();
  });

  test('L2-048 AC5: a request that is not the member’s shows the not found page', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    await detail.setWidth(1280);
    await stubMemberRequests(page, { detail: 'missing' });
    await jb.goto(`/requests/${DRAIN}`);

    await expect(page.locator('body')).toHaveAttribute('data-page', 'not-found');
  });

  test('L2-048 AC6: a request that cannot load quotes its reference and goes back', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    await detail.setWidth(1280);
    const fake = await stubMemberRequests(page, { detail: 'fails' });
    await jb.goto(`/requests/${DRAIN}`);

    await expect(detail.alert).toContainText('We couldn’t load this request');
    await expect(detail.reference).toHaveText('JB-REQ-502');
    await expect(detail.backToRequests).toBeVisible();
    fake.detail = 'ok';
    await detail.tryAgain.click();
    await expect(detail.heading).toHaveText('Kitchen drain is slow and gurgling');
  });

  test('L2-070: an owner’s answer shows on the open page with a toast', async ({ page, jb }) => {
    const detail = new RequestDetailPage(page);
    const toasts = new Toasts(page);
    await detail.setWidth(1280);
    const fake = await stubMemberRequests(page);
    await jb.goto(`/requests/${DRAIN}`);
    await expect(detail.callout).toContainText('Waiting for');

    fake.answer(DRAIN, 'confirmed');

    await expect(detail.callout).toContainText('Wanda confirmed your order', { timeout: 10_000 });
    await expect(
      toasts.withTitle('WaterWorks Plumbing & Drains confirmed your quote request'),
    ).toBeVisible();
  });
});

test.describe('track requests: cancel (L2-049)', () => {
  test('L2-049 AC1: Cancel request asks, names the business and keeps "Keep request" as the first choice', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    const dialog = new CancelRequestDialog(page);
    await detail.setWidth(1280);
    const fake = await stubMemberRequests(page);
    await jb.goto(`/requests/${DRAIN}`);

    await detail.cancel.click();

    await expect(dialog.title).toHaveText(
      'Cancel your quote request to WaterWorks Plumbing & Drains?',
    );
    await expect(dialog.description).toContainText(
      'WaterWorks Plumbing & Drains is told straight away. You can ask again later.',
    );
    await expect(dialog.keep).toBeFocused();
    await dialog.keep.click();
    await expect(dialog.root).toHaveCount(0);
    expect(fake.cancels).toEqual([]);
  });

  test('L2-049 AC2, AC3: cancelling tells the business, offers Undo, and Undo makes the request open again', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    const dialog = new CancelRequestDialog(page);
    const toasts = new Toasts(page);
    await detail.setWidth(1280);
    const fake = await stubMemberRequests(page);
    await jb.goto(`/requests/${DRAIN}`);

    await detail.cancel.click();
    await dialog.cancel.click();

    const toast = toasts.withTitle('Request cancelled');
    await expect(toast).toContainText('WaterWorks Plumbing & Drains has been told.');
    expect(fake.cancels).toEqual([DRAIN]);
    await expect(detail.callout).toContainText('You cancelled this request');
    await expect(detail.cancel).toHaveCount(0);

    await toasts.action(toast, 'Undo').click();

    await expect(toasts.withTitle('Cancellation withdrawn')).toBeVisible();
    expect(fake.undos).toEqual([DRAIN]);
    await expect(detail.callout).toContainText('Waiting for WaterWorks Plumbing & Drains to reply');
    await expect(detail.cancel).toBeVisible();
  });

  test('L2-049 AC4, L2-128: a failed cancel keeps the dialog open and offers Try again', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    const dialog = new CancelRequestDialog(page);
    await detail.setWidth(1280);
    const fake = await stubMemberRequests(page, { cancel: 'fails' });
    await jb.goto(`/requests/${DRAIN}`);

    await detail.cancel.click();
    await dialog.cancel.click();

    await expect(dialog.alert).toContainText('We couldn’t cancel it');
    await expect(dialog.alert).toContainText('The request is still open.');
    fake.cancel = 'ok';
    await dialog.tryAgain.click();
    await expect(dialog.root).toHaveCount(0);
    expect(fake.cancels).toEqual([DRAIN]);
  });

  test('L2-049 AC5: a booking less than a day away adds the short-notice line', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    const dialog = new CancelRequestDialog(page);
    await detail.setWidth(1280);
    const fake = await stubMemberRequests(page);
    fake.requests.find((r) => r.id === MEETING)!.shortNotice = true;
    await jb.goto(`/requests/${MEETING}`);

    await detail.cancel.click();

    await expect(dialog.title).toHaveText('Cancel your booking to Legacy Financial?');
    await expect(dialog.description).toContainText(
      'It’s less than a day away; consider messaging Trevor too.',
    );
  });

  test('a request the owner answered a moment ago reloads instead of cancelling', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    const dialog = new CancelRequestDialog(page);
    await detail.setWidth(1280);
    await stubMemberRequests(page, { cancel: 'conflict' });
    await jb.goto(`/requests/${DRAIN}`);

    await detail.cancel.click();
    await dialog.cancel.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(detail.callout).toContainText('can’t take this job');
    await expect(detail.cancel).toHaveCount(0);
  });

  test('a closed request offers no cancel', async ({ page, jb }) => {
    const detail = new RequestDetailPage(page);
    await detail.setWidth(1280);
    await stubMemberRequests(page);
    await jb.goto(`/requests/${FLOWERS}`);

    await expect(detail.callout).toContainText('Completed');
    await expect(detail.cancel).toHaveCount(0);
  });
});
