import { expect, test } from '../fixtures/jb-test';
import { legacyMessages, photoMessages, requestCards, stubMessaging } from '../fixtures/messaging';
import { brokenLargeJpeg, largePng, pdfNamedJpeg, smallJpeg } from '../fixtures/photos';
import { BusinessPage } from '../pages/business.page';
import { NotFoundPage } from '../pages/not-found.page';
import {
  BubbleRegion,
  ConversationPage,
  MessagesPage,
  NewMessageDialog,
} from '../pages/messages.page';
import { ReportConversationDialog } from '../pages/report-conversation.dialog';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';
import { Toasts } from '../pages/toasts';

// Message a business: L2-055 to L2-063. The API is answered by Playwright mocking (ADR 0009);
// the requests the app makes are kept to prove what it sends.

test.describe('the inbox (L2-056)', () => {
  test('AC1: it lists the conversations newest first, with the time, a preview and what is unread', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/messages');
    await expect.poll(() => messages.dataPage()).toBe('messages');

    await expect(messages.heading).toHaveText('Messages');
    await expect(messages.subtitle).toHaveText('4 conversations · 2 unread');
    await expect(messages.list.rows).toHaveCount(4);
    await expect(messages.list.name(messages.list.rows.nth(0))).toHaveText('Legacy Financial');
    await expect(messages.list.time(messages.list.rows.nth(0))).toHaveText('9:14 a.m.');
    await expect(messages.list.time(messages.list.rows.nth(1))).toHaveText('Yesterday');
    await expect(messages.list.time(messages.list.rows.nth(2))).toHaveText('Sat 7 Nov');
    await expect(messages.list.time(messages.list.rows.nth(3))).toHaveText('28 Oct');
    await expect(messages.list.snippet(messages.list.rows.nth(0))).toContainText(
      'Trevor: Thursday at 10:00 works. See you then!',
    );
    await expect(messages.list.snippet(messages.list.rows.nth(2))).toContainText(
      'You: Perfect, I’ll pick it up Friday.',
    );
    // Unread is said in words as well as with a dot.
    await expect(messages.list.snippet(messages.list.rows.nth(0))).toContainText('Unread.');
    await expect(messages.list.snippet(messages.list.rows.nth(2))).not.toContainText('Unread.');
    await expect(messages.pickPrompt).toBeVisible();
  });

  test('AC4: a member without conversations is invited to browse', async ({ page, jb }) => {
    const messages = new MessagesPage(page);
    await jb.signInAs('member');
    await stubMessaging(page, { inbox: 'empty' });
    await jb.goto('/messages');

    await expect(messages.subtitle).toHaveText('No conversations yet');
    await expect(messages.emptyState).toBeVisible();
    await expect(messages.browseBusinesses).toHaveAttribute('href', '/');
  });

  test('the inbox says it is loading', async ({ page, jb }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { inbox: 'loading' });
    await jb.goto('/messages');

    await expect(messages.list.loading).toBeAttached();
    await expect(messages.list.rows).toHaveCount(0);
  });

  test('when it cannot load, it quotes JB-MSG-503 and Try again loads it', async ({ page, jb }) => {
    const messages = new MessagesPage(page);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { inbox: 'error' });
    await jb.goto('/messages');

    await expect(messages.errorState).toBeVisible();
    await expect(messages.errorReference).toHaveText('JB-MSG-503');

    fake.inbox = 'ok';
    await messages.tryAgain.click();
    await expect(messages.list.rows).toHaveCount(4);
  });

  test('a visitor is taken to sign in and comes back afterwards (L2-012)', async ({ page, jb }) => {
    await jb.goto('/messages');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fmessages$/);
  });
});

test.describe('search messages (L2-059)', () => {
  test('AC1, AC2: typing searches the conversations and a miss offers to clear the search', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages');
    await expect(messages.list.rows).toHaveCount(4);

    await messages.list.search.fill('legacy');
    await expect(messages.list.rows).toHaveCount(1);
    expect(fake.searches.at(-1)).toBe('legacy');

    await messages.list.search.fill('roofing');
    await expect(messages.list.noResults).toContainText('No messages match ‘roofing’');

    await messages.list.clearSearch.click();
    await expect(messages.list.rows).toHaveCount(4);
    await expect(messages.list.search).toHaveValue('');
  });
});

test.describe('a conversation (L2-057)', () => {
  test('AC1, AC2: it shows the business, who answers, the day and the messages, and marks them read', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/messages');
    await new MessagesPage(page).list.row('Legacy Financial').click();
    await expect.poll(() => conversation.dataPage()).toBe('conversation');

    await expect(page).toHaveURL(/\/messages\/c-legacy$/);
    await expect(conversation.heading).toHaveText('Legacy Financial');
    await expect(conversation.caption).toHaveText('Trevor Chew · usually replies within a day');
    await expect(conversation.listingLink).toHaveAttribute('href', '/b/legacy-financial');
    await expect(conversation.days).toHaveText(['Today · Tue 10 Nov']);
    await expect(conversation.bubbles).toHaveCount(3);
    await expect(conversation.bubbles.nth(0)).toContainText('Trevor: Hi Joanna');
    await expect(conversation.bubbles.nth(0)).not.toHaveClass(/bubble--me/);
    await expect(conversation.bubbles.nth(1)).toHaveClass(/bubble--me/);
    await expect(conversation.bubbles.nth(1)).toContainText('You: Thank you!');
    await expect(conversation.bubble('Thursday at 10:00').time).toHaveText('9:14 a.m.');
    await expect(conversation.list.row('Legacy Financial')).toHaveAttribute('aria-current', 'page');
  });

  test('AC6: a conversation that is not yours is not found', async ({ page, jb }) => {
    await jb.signInAs('member');
    await stubMessaging(page, { conversation: 'not-found' });
    await jb.goto('/messages/c-legacy');

    await expect(new NotFoundPage(page).heading).toBeVisible();
  });

  test('AC7: the latest messages show first and "Show earlier messages" adds the older ones', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, {
      hasMore: true,
      earlier: [
        {
          id: 'm-0',
          body: 'An earlier question',
          sentAt: '2026-11-09T14:00:00Z',
          mine: true,
          senderFirstName: 'Joanna',
          attachment: null,
        },
      ],
    });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.showEarlier.click();

    await expect(conversation.bubbles).toHaveCount(4);
    await expect(conversation.bubbles.nth(0)).toContainText('An earlier question');
    await expect(conversation.showEarlier).toHaveCount(0);
    expect(fake.opened.at(-1)?.before).toBe('m-1');
  });

  test('it says it is loading', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await jb.signInAs('member');
    await stubMessaging(page, { conversation: 'loading' });
    await jb.goto('/messages/c-legacy');

    await expect(conversation.loadingNote).toBeAttached();
  });

  test('when it cannot load, it quotes JB-MSG-502 and Try again loads it', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { conversation: 'error' });
    await jb.goto('/messages/c-legacy');

    await expect(conversation.errorState).toBeVisible();
    await expect(conversation.errorReference).toHaveText('JB-MSG-502');

    fake.conversation = 'ok';
    await conversation.tryAgain.click();
    await expect(conversation.bubbles).toHaveCount(3);
  });

  test('L2-063 AC4: message text is shown as text, never as markup or a link', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, {
      messages: [
        {
          id: 'm-1',
          body: '<a href="https://evil.example">Click</a> https://example.com',
          sentAt: '2026-11-10T13:52:00Z',
          mine: false,
          senderFirstName: 'Trevor',
          attachment: null,
        },
      ],
    });
    await jb.goto('/messages/c-legacy');

    await expect(conversation.bubbles).toHaveCount(1);
    await expect(conversation.bubbles.first()).toContainText(
      '<a href="https://evil.example">Click</a> https://example.com',
    );
    await expect(conversation.linksInMessages).toHaveCount(0);
  });

  test('L2-062: an owner who is away is shown in the conversation', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { awayUntil: '2026-11-14T14:00:00Z' });
    await jb.goto('/messages/c-legacy');

    await expect(conversation.away).toContainText('Trevor Chew is away');
  });
});

test.describe('request cards (L2-057 AC4)', () => {
  test('AC4: a request shows as a card in the timeline, at the time it was sent, with its status', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');

    const card = conversation.card('Discovery meeting');
    await expect(card.kind).toHaveText('Booking request');
    await expect(card.detail).toHaveText('Thu 12 Nov, 10:00–10:30 a.m. · Video');
    await expect(card.status).toHaveText('Confirmed');
    await expect(card.viewRequest).toHaveAttribute('href', '/requests/r-booking');
    await expect(conversation.timeline).toContainText([
      'Today · Tue 10 Nov',
      'Hi Joanna',
      'Thank you!',
      'Discovery meeting',
      'Thursday at 10:00 works',
    ]);
  });

  test('AC8: booking, quote and order cards say what was asked and their status in words', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { requests: requestCards() });
    await jb.goto('/messages/c-legacy');

    await expect(conversation.cards).toHaveCount(4);
    await expect(conversation.card('Discovery meeting').status).toHaveText('Awaiting reply');
    const quote = conversation.card('A plan for giving');
    await expect(quote.kind).toHaveText('Quote request');
    await expect(quote.detail).toHaveText('Needed by Fri 27 Nov');
    const order = conversation.card('Retirement planning workbook');
    await expect(order.kind).toHaveText('Order request');
    await expect(order.detail).toHaveText('Pickup · $24.00 + tax');
    await expect(order.status).toHaveText('Declined');
    await expect(conversation.card('Follow-up meeting').status).toHaveText('Cancelled');
  });

  test('AC4: the card follows the request when its status changes, without a reload', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { live: true, requests: [requestCards()[0]] });
    await jb.goto('/messages/c-legacy');
    const card = conversation.card('Discovery meeting');
    await expect(card.status).toHaveText('Awaiting reply');

    fake.requests[0] = { ...fake.requests[0], status: 'confirmed', statusLabel: 'Confirmed' };
    fake.notify(
      'request',
      'Legacy Financial confirmed your meeting',
      'Thu 12 Nov, 10:00 a.m.',
      '/requests/r-booking',
    );

    await expect(card.status).toHaveText('Confirmed', { timeout: 2000 });
    await expect(conversation.cards).toHaveCount(1);
  });

  test('AC4: a request made while the conversation is open adds its card', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { live: true, requests: [] });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);
    await expect(conversation.cards).toHaveCount(0);

    fake.requests.push({ ...requestCards()[1], sentAt: '2026-11-10T14:20:00Z' });
    fake.notify(
      'request',
      'Your quote request was sent',
      'A plan for giving and RRSPs',
      '/requests/r-quote',
    );

    await expect(conversation.card('A plan for giving').status).toHaveText('Confirmed', {
      timeout: 2000,
    });
    await expect(conversation.timeline.last()).toContainText('A plan for giving');
  });

  test('AC9: for the owner "View request" opens the owner’s Requests', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, {
      canBlock: false,
      requests: [{ ...requestCards()[0], link: '/my-business/requests' }],
    });
    await jb.goto('/messages/c-legacy');

    await expect(conversation.card('Discovery meeting').viewRequest).toHaveAttribute(
      'href',
      '/my-business/requests',
    );
  });
});

test.describe('real-time arrival (L2-057 AC5, L2-070)', () => {
  test('AC5: a reply appears in the open conversation within 2 seconds, without a reload, and is announced', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { live: true });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);
    await expect(conversation.announcement).toHaveText('');
    await page.evaluate(() => ((window as { stayed?: boolean }).stayed = true));

    fake.arrive('I’ve sent the meeting link to your e-mail.');

    const arrived = conversation.bubble('I’ve sent the meeting link');
    await expect(arrived.root).toBeVisible({ timeout: 2000 });
    await expect(arrived.time).toHaveText('9:15 a.m.');
    await expect(conversation.announcement).toHaveText('New message from Trevor');
    await expect(conversation.announcement).toHaveAttribute('role', 'status');
    expect(await page.evaluate(() => (window as { stayed?: boolean }).stayed)).toBe(true);
    // The member is reading it, so no toast repeats it.
    await expect(toasts.withTitle('New message from Legacy Financial')).toHaveCount(0);
    // Reading again marks the conversation read on the server (L2-057 AC2).
    expect(fake.opened.filter((open) => open.before === null).length).toBeGreaterThan(1);
  });

  test('AC5: a second reply is shown once and announced again', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { live: true });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    fake.arrive('One.');
    await expect(conversation.bubbles).toHaveCount(4);
    fake.arrive('Two.');
    await expect(conversation.bubbles).toHaveCount(5);
    await expect(conversation.bubbles.filter({ hasText: 'One.' })).toHaveCount(1);
  });

  test('L2-056, L2-070: the inbox row of another conversation moves up and says unread, with a toast', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { live: true });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.list.rows.first()).toContainText('Legacy Financial');

    fake.arrive('Your flowers are ready for pickup.', 'c-flowers');

    const row = conversation.list.rows.first();
    await expect(row).toContainText('Flower Creations', { timeout: 2000 });
    await expect(conversation.list.snippet(row)).toContainText(
      'Unread. Your flowers are ready for pickup.',
    );
    await expect(toasts.withTitle('New message from Flower Creations')).toBeVisible();
    await expect(conversation.bubbles).toHaveCount(3);
  });

  test('L2-056, L2-070: the Messages page lists a new message without a reload', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { live: true });
    await jb.goto('/messages');
    await expect(messages.subtitle).toHaveText('4 conversations · 2 unread');

    fake.arrive('Your flowers are ready for pickup.', 'c-flowers');

    await expect(messages.subtitle).toHaveText('4 conversations · 3 unread', { timeout: 2000 });
    await expect(messages.list.rows.first()).toContainText('Flower Creations');
  });
});

test.describe('mute a conversation (L2-061)', () => {
  test('AC3: "More" opens a menu with Mute and Report conversation, by keyboard too', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');

    await conversation.more.focus();
    await page.keyboard.press('Enter');
    await expect(conversation.menuItem('Mute')).toBeFocused();
    await expect(conversation.more).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(conversation.menuItem('Report conversation')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(conversation.menu).toBeHidden();
    await expect(conversation.more).toBeFocused();
  });

  test('AC1, AC4: Mute saves it, says so in a toast and in the header, and Undo unmutes', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await expect(conversation.muted).toHaveCount(0);

    await conversation.more.click();
    await conversation.menuItem('Mute').click();

    const toast = toasts.withTitle('Conversation muted');
    await expect(toast).toContainText('You won’t be e-mailed about new replies here.');
    await expect(conversation.muted).toHaveText('Muted');
    expect(fake.mutes).toEqual([true]);

    await toasts.action(toast, 'Undo').click();
    await expect(conversation.muted).toHaveCount(0);
    expect(fake.mutes).toEqual([true, false]);
  });

  test('AC2: a muted conversation offers Unmute, which turns the e-mails back on', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { muted: true });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.muted).toHaveText('Muted');

    await conversation.more.click();
    await expect(conversation.menuItem('Mute')).toHaveCount(0);
    await conversation.menuItem('Unmute').click();

    await expect(conversation.muted).toHaveCount(0);
    expect(fake.mutes).toEqual([false]);
  });

  test('AC5: when the mute cannot be saved the conversation stays as it was and a toast says so', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { muting: 'fail' });
    await jb.goto('/messages/c-legacy');

    await conversation.more.click();
    await conversation.menuItem('Mute').click();

    await expect(toasts.withTitle('We couldn’t mute this conversation')).toContainText(
      'Try again.',
    );
    await expect(conversation.muted).toHaveCount(0);
  });
});

test.describe('photo attachments (L2-060)', () => {
  test('AC5: a chosen photo shows as a preview in the composer until it is removed or sent', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await expect(conversation.attachPhoto).toBeVisible();

    await conversation.photoInput.setInputFiles(smallJpeg());
    await expect(conversation.attachedPhoto).toBeVisible();
    await expect(conversation.attachPhoto).toHaveCount(0);

    await conversation.removePhoto.click();
    await expect(conversation.attachedPhoto).toHaveCount(0);
    await expect(conversation.attachPhoto).toBeFocused();
    expect(fake.uploads).toEqual([]);
  });

  test('AC1: a photo is uploaded and sent with the message, and shows in its bubble', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');

    await conversation.photoInput.setInputFiles(smallJpeg());
    await conversation.composer.fill('Here’s the page of the statement I mentioned.');
    await conversation.send.click();

    const bubble = conversation.bubble('Here’s the page');
    await expect(bubble.photo).toHaveAttribute('src', '/api/attachments/a-1?expires=1&sig=first');
    await expect(bubble.photo).toHaveAccessibleName('Photo from you');
    await expect(bubble.time).toHaveText('9:00 a.m.');
    await expect(conversation.attachedPhoto).toHaveCount(0);
    expect(fake.uploads).toHaveLength(1);
    expect(fake.uploads[0].contentType).toBe('image/jpeg');
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0]).toMatchObject({
      body: 'Here’s the page of the statement I mentioned.',
      attachmentId: 'a-1',
    });
    expect(fake.sends[0].idempotencyKey).toBeTruthy();
  });

  test('AC6: a photo is sent without text', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.photoInput.setInputFiles(smallJpeg());
    await conversation.send.click();

    await expect(conversation.bubbles).toHaveCount(4);
    await expect(new BubbleRegion(conversation.bubbles.last()).photo).toBeVisible();
    expect(fake.sends).toEqual([
      { body: '', idempotencyKey: expect.any(String), attachmentId: 'a-1' },
    ]);
  });

  test('AC7: a message with a photo shows the photo and "Sending…" while it is on its way', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { uploading: 'hang' });
    await jb.goto('/messages/c-legacy');

    await conversation.photoInput.setInputFiles(smallJpeg());
    await conversation.composer.fill('The statement');
    await conversation.send.click();

    const bubble = conversation.bubble('The statement');
    await expect(bubble.root).toHaveClass(/bubble--pending/);
    await expect(bubble.photo).toBeVisible();
    await expect(bubble.status).toHaveText('Sending…');
    await expect(conversation.composer).toHaveValue('');
    await expect(conversation.attachPhoto).toBeVisible();
  });

  test('AC7: a retry sends the same message and the same photo once', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { delivery: 'fail' });
    await jb.goto('/messages/c-legacy');
    await conversation.photoInput.setInputFiles(smallJpeg());
    await conversation.composer.fill('The statement');
    await conversation.send.click();

    const bubble = conversation.bubble('The statement');
    await expect(bubble.time).toContainText('Not sent. Check your connection.');
    await expect(bubble.photo).toBeVisible();

    fake.delivery = 'ok';
    await bubble.tryAgain.click();
    await expect(bubble.time).toHaveText('9:00 a.m.');
    expect(fake.uploads).toHaveLength(1);
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0].attachmentId).toBe('a-1');
  });

  test('AC7: when the upload does not go the message says so, and "Try again" uploads it', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { uploading: 'fail' });
    await jb.goto('/messages/c-legacy');
    await conversation.photoInput.setInputFiles(smallJpeg());
    await conversation.composer.fill('The statement');
    await conversation.send.click();

    const bubble = conversation.bubble('The statement');
    await expect(bubble.time).toContainText('Not sent. Check your connection.');
    expect(fake.sends).toEqual([]);

    fake.uploading = 'ok';
    await bubble.tryAgain.click();
    await expect(bubble.time).toHaveText('9:00 a.m.');
    expect(fake.uploads).toHaveLength(1);
    expect(fake.sends).toHaveLength(1);
  });

  test('AC2: a photo over 5 MB is shrunk on the device, with a warning, before it is sent', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    const large = largePng();
    expect(large.buffer.length).toBeGreaterThan(5 * 1024 * 1024);

    await conversation.photoInput.setInputFiles(large);

    await expect(toasts.withTitle('Photo is large')).toContainText(
      'Shrinking it to 5 MB before sending.',
    );
    await expect(conversation.attachedPhoto).toBeVisible();
    await conversation.send.click();
    await expect(conversation.bubbles).toHaveCount(4);
    expect(fake.uploads).toHaveLength(1);
    expect(fake.uploads[0].contentType).toBe('image/jpeg');
    expect(fake.uploads[0].bytes).toBeLessThanOrEqual(5 * 1024 * 1024);
  });

  for (const [what, file] of [
    ['is not a JPG or PNG, whatever its name', pdfNamedJpeg],
    ['cannot be shrunk', brokenLargeJpeg],
  ] as const) {
    test(`AC3: a file that ${what} is refused with an error and nothing is attached`, async ({
      page,
      jb,
    }) => {
      const conversation = new ConversationPage(page);
      const toasts = new Toasts(page);
      await conversation.setWidth(1280);
      await jb.signInAs('member');
      const fake = await stubMessaging(page);
      await jb.goto('/messages/c-legacy');

      await conversation.photoInput.setInputFiles(file());

      await expect(toasts.withTitle('Photo couldn’t be attached')).toContainText(
        'Use a JPG or PNG under 5 MB.',
      );
      await expect(conversation.attachedPhoto).toHaveCount(0);
      await expect(conversation.attachPhoto).toBeVisible();
      await conversation.send.click();
      expect(fake.uploads).toEqual([]);
      expect(fake.sends).toEqual([]);
    });
  }

  test('AC1, AC4: photos show in their bubbles through their signed links, with and without text', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { messages: [...legacyMessages(), ...photoMessages()] });
    await jb.goto('/messages/c-legacy');

    const mine = conversation.bubble('Here’s the page');
    const theirs = new BubbleRegion(conversation.bubbles.last());
    await expect(mine.photo).toHaveAttribute(
      'src',
      /\/api\/attachments\/a-statement\?expires=1&sig=first/,
    );
    await expect(theirs.photo).toHaveAccessibleName('Photo from Trevor');
    await expect(theirs.time).toHaveText('9:26 a.m.');
    expect(
      await theirs.photo.evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
    expect(fake.renewals).toEqual([]);
  });

  test('AC8: a photo whose link has expired gets a new one and shows', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, {
      messages: [...legacyMessages(), photoMessages()[0]],
      links: 'expired',
    });
    await jb.goto('/messages/c-legacy');

    const bubble = conversation.bubble('Here’s the page');
    await expect(bubble.photo).toHaveAttribute('src', /sig=renewed/);
    await expect
      .poll(() => bubble.photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    expect(fake.renewals).toEqual(['a-statement']);
  });

  test('AC8: when no new link can be had the bubble says "Photo unavailable"', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, {
      messages: [...legacyMessages(), photoMessages()[0]],
      links: 'expired',
      renewing: 'fail',
    });
    await jb.goto('/messages/c-legacy');

    const bubble = conversation.bubble('Here’s the page');
    await expect(bubble.photoMissing).toHaveText('Photo unavailable');
    await expect(bubble.photo).toHaveCount(0);
    expect(fake.renewals).toEqual(['a-statement']);
  });

  test('AC8: "View photo" opens the photo in a new tab through a new link', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { messages: [...legacyMessages(), photoMessages()[0]] });
    await jb.goto('/messages/c-legacy');

    const opened = page.waitForEvent('popup');
    await conversation.bubble('Here’s the page').viewPhoto.click();

    expect((await opened).url()).toContain('/api/attachments/a-statement?expires=1&sig=renewed');
    expect(fake.renewals).toEqual(['a-statement']);
  });
});

test.describe('report a conversation (L2-063)', () => {
  test('AC5: "Report conversation" opens the dialog, and a member may block the business', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const dialog = new ReportConversationDialog(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');

    await conversation.more.click();
    await conversation.menuItem('Report conversation').click();

    await expect(dialog.title).toHaveText('Report this conversation');
    await expect(dialog.description).toHaveText(
      'Reports are private. Our verification team reads this conversation only while the report is open.',
    );
    await expect(dialog.counter).toHaveText('1,000 characters left');
    await expect(dialog.block).not.toBeChecked();
    await expect(dialog.block).toHaveAccessibleName(/Block Legacy Financial/);
    await expect(dialog.blockHelp).toHaveText(
      'They won’t be told. Their messages will stop reaching you.',
    );

    await page.keyboard.press('Escape');
    await expect(dialog.root).toBeHidden();
    await expect(conversation.more).toBeFocused();
  });

  test('AC5: an owner reports without a block choice', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    const dialog = new ReportConversationDialog(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { canBlock: false });
    await jb.goto('/messages/c-legacy');

    await conversation.more.click();
    await conversation.menuItem('Report conversation').click();
    await expect(dialog.block).toHaveCount(0);
    await dialog.what.fill('He keeps sending the same message.');
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Thanks for telling us');
    expect(fake.reports).toEqual([{ reason: 'He keeps sending the same message.', block: false }]);
  });

  test('AC6: with nothing written the field says what to do and nothing is sent', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const dialog = new ReportConversationDialog(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.more.click();
    await conversation.menuItem('Report conversation').click();

    await dialog.what.fill('   ');
    await dialog.send.click();

    await expect(dialog.whatError).toHaveText('Add a sentence or two so we know what to check.');
    await expect(dialog.what).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.what).toBeFocused();
    expect(fake.reports).toEqual([]);
  });

  test('AC1, AC7: the report is sent with the block, and the dialog says the business is blocked', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const dialog = new ReportConversationDialog(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.more.click();
    await conversation.menuItem('Report conversation').click();

    await dialog.what.fill('He asks for a deposit by e-transfer before we have met.');
    await expect(dialog.counter).toHaveText('945 characters left');
    await dialog.block.check();
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Thanks for telling us');
    await expect(dialog.description).toHaveText(
      'Your report is private. Our verification team reviews it within one business day. Legacy Financial is blocked.',
    );
    expect(fake.reports).toEqual([
      { reason: 'He asks for a deposit by e-transfer before we have met.', block: true },
    ]);
    await dialog.close.click();
    await expect(dialog.root).toBeHidden();
  });

  test('AC7: a report that did not go keeps what was typed, and "Send report" tries again', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const dialog = new ReportConversationDialog(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { reporting: 'fail' });
    await jb.goto('/messages/c-legacy');
    await conversation.more.click();
    await conversation.menuItem('Report conversation').click();
    await dialog.what.fill('Spam, three times a day.');
    await dialog.send.click();

    await expect(dialog.alert).toContainText('We couldn’t send that');
    await expect(dialog.what).toHaveValue('Spam, three times a day.');

    fake.reporting = 'ok';
    await dialog.send.click();
    await expect(dialog.title).toHaveText('Thanks for telling us');
    await expect(dialog.description).toHaveText(
      'Your report is private. Our verification team reviews it within one business day.',
    );
    expect(fake.reports).toEqual([{ reason: 'Spam, three times a day.', block: false }]);
  });
});

test.describe('send a message (L2-058)', () => {
  test('AC1: it appears at once as "Sending…" and the composer clears', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { delivery: 'hang' });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.composer.fill('Should I bring last year’s tax return?');
    await conversation.send.click();

    const sending = conversation.bubble('Should I bring');
    await expect(sending.root).toHaveClass(/bubble--pending/);
    await expect(sending.status).toHaveText('Sending…');
    await expect(conversation.composer).toHaveValue('');
  });

  test('AC1: the request carries the text and an idempotency key, and the confirmed message shows its time', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.composer.fill('  Wonderful. See you Thursday.  ');
    await conversation.send.click();

    const sent = conversation.bubble('Wonderful. See you Thursday.');
    await expect(sent.time).toHaveText('9:00 a.m.');
    await expect(sent.root).not.toHaveClass(/bubble--pending/);
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0].body).toBe('Wonderful. See you Thursday.');
    expect(fake.sends[0].idempotencyKey).toMatch(/^[\w-]{8,}$/);
  });

  test('AC5: Enter sends, Shift+Enter makes a new line, and an empty message is not sent', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.composer.press('Enter');
    await conversation.composer.fill('   ');
    await conversation.send.click();
    expect(fake.sends).toHaveLength(0);

    await conversation.composer.fill('First line');
    await conversation.composer.press('Shift+Enter');
    await conversation.composer.pressSequentially('Second line');
    expect(fake.sends).toHaveLength(0);
    await conversation.composer.press('Enter');

    await expect(conversation.bubbles).toHaveCount(4);
    expect(fake.sends[0].body).toBe('First line\nSecond line');
  });

  test('AC3: a message that did not go says so, and "Try again" sends it once with the same key', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { delivery: 'fail' });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.composer.fill('Can we do Thursday?');
    await conversation.send.click();

    const failed = conversation.bubble('Can we do Thursday?');
    await expect(failed.root).toHaveClass(/bubble--failed/);
    await expect(failed.time).toContainText('Not sent. Check your connection.');

    fake.delivery = 'ok';
    await failed.tryAgain.click();

    await expect(conversation.bubble('Can we do Thursday?').time).toHaveText('9:00 a.m.');
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0].body).toBe('Can we do Thursday?');
  });

  test('AC3: a failed message can be deleted', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { delivery: 'fail' });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.composer.fill('Never mind');
    await conversation.send.click();
    await conversation.bubble('Never mind').delete.click();

    await expect(conversation.bubbles).toHaveCount(3);
  });

  test('L2-137: when sending too fast it says to wait', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { delivery: 'rate-limited' });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.composer.fill('Hello again');
    await conversation.send.click();

    await expect(conversation.bubble('Hello again').time).toContainText('wait a few minutes');
  });
});

test.describe('message a business (L2-055)', () => {
  test('AC1: "Message" on a listing opens the dialog over the page, addressed to the business', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const dialog = new NewMessageDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/b/legacy-financial');
    await expect(business.heading).toHaveText('Legacy Financial');

    await business.messageLink.click();

    await expect(page).toHaveURL(/\/b\/legacy-financial\/message$/);
    await expect(dialog.title).toHaveText('Message Legacy Financial');
    await expect(dialog.description).toContainText(
      'Trevor Chew usually replies within a day. The conversation continues in Messages.',
    );
    await expect(dialog.message).toBeFocused();
  });

  test('AC3: sending starts the conversation and opens it in Messages', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const dialog = new NewMessageDialog(page);
    const conversation = new ConversationPage(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('Hello Trevor, do you help newcomers set up RESPs?');
    await dialog.send.click();

    await expect(page).toHaveURL(/\/messages\/c-legacy$/);
    await expect(conversation.heading).toHaveText('Legacy Financial');
    expect(fake.starts).toHaveLength(1);
    expect(fake.starts[0].listingSlug).toBe('legacy-financial');
    expect(fake.starts[0].body).toBe('Hello Trevor, do you help newcomers set up RESPs?');
    expect(fake.starts[0].idempotencyKey).toMatch(/^[\w-]{8,}$/);
  });

  test('AC2, AC5: an empty message is not sent and the field says what to do', async ({
    page,
    jb,
  }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('   ');
    await dialog.send.click();

    await expect(dialog.fieldError).toHaveText('Write a message before sending.');
    await expect(dialog.message).toHaveAttribute('aria-invalid', 'true');
    expect(fake.starts).toHaveLength(0);
  });

  test('AC5: more than 4,000 characters is not sent', async ({ page, jb }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('a'.repeat(4001));
    await dialog.send.click();

    await expect(dialog.fieldError).toContainText('4,000 characters');
    expect(fake.starts).toHaveLength(0);
  });

  test('while sending the dialog is busy and cannot be sent twice', async ({ page, jb }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { delivery: 'hang' });
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('Hello');
    await dialog.send.click();

    await expect(dialog.send).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancel).toBeDisabled();
    await expect(dialog.message).toHaveAttribute('readonly', '');
  });

  test('AC4: a send that failed keeps the text and "Send message" tries again with the same key', async ({
    page,
    jb,
  }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { delivery: 'fail' });
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('Hello Trevor');
    await dialog.send.click();

    await expect(dialog.alert).toContainText('We couldn’t send that');
    await expect(dialog.message).toHaveValue('Hello Trevor');

    fake.delivery = 'ok';
    await dialog.send.click();

    await expect(page).toHaveURL(/\/messages\/c-legacy$/);
    expect(fake.starts).toHaveLength(1);
  });

  test('L2-005 AC2: a member who has not confirmed the e-mail is told to', async ({ page, jb }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { delivery: 'unconfirmed' });
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('Hello Trevor');
    await dialog.send.click();

    await expect(dialog.alert).toContainText('Confirm your e-mail first');
    await expect(dialog.message).toHaveValue('Hello Trevor');
  });

  test('Cancel closes the dialog and returns to the listing', async ({ page, jb }) => {
    const business = new BusinessPage(page);
    const dialog = new NewMessageDialog(page);
    await business.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');

    await dialog.cancel.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(page).toHaveURL(/\/b\/legacy-financial$/);
  });

  test('Escape closes the dialog and returns to the listing', async ({ page, jb }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');
    await expect(dialog.message).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(page).toHaveURL(/\/b\/legacy-financial$/);
  });

  test('L2-012: a visitor is asked to join or sign in and is brought back to the message', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    const prompt = new SignInRequiredDialog(page);
    await business.setWidth(1280);
    await jb.goto('/b/legacy-financial');
    await expect(business.heading).toHaveText('Legacy Financial');

    await business.messageLink.click();

    await expect(prompt.title).toHaveText('Join to message Legacy Financial');
    await expect(prompt.joinFree).toHaveAttribute(
      'href',
      '/join?returnUrl=%2Fb%2Flegacy-financial%2Fmessage',
    );
    await expect(prompt.signIn).toHaveAttribute(
      'href',
      '/sign-in?returnUrl=%2Fb%2Flegacy-financial%2Fmessage',
    );
  });
});

test.describe('the unread badge (L2-056)', () => {
  test('the Messages entry of the top bar counts the unread conversations', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member', { unreadConversationCount: 2 });
    await stubMessaging(page);
    await jb.goto('/messages');

    await expect(messages.badgeIn(messages.topBarLink(/^Messages/))).toHaveText('2');
  });
});
