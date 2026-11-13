import { expect, test } from '../fixtures/jb-test';
import {
  legacyMessages,
  manyRows,
  ownerRows,
  photoMessages,
  requestCards,
  stubMessaging,
} from '../fixtures/messaging';
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
    await expect(messages.emptyBlock).toContainText(
      'Open a business and tap Message to ask a question, get a quote or book a time. Replies land here.',
    );
    await expect(messages.browseBusinesses).toHaveAttribute('href', '/');
  });

  test('AC5: on a wide screen with no conversation open, the right pane says to pick one', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1024);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/messages');

    await expect(messages.pickPrompt).toBeVisible();
    await expect(messages.pickBlock).toContainText('Choose one on the left to read and reply.');

    await messages.setWidth(1023);
    await expect(messages.pickPrompt).toBeHidden();
    await expect(messages.list.rows).toHaveCount(4);
  });

  test('AC6: an owner’s conversations with members are named with the member and the business', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { rows: ownerRows() });
    await jb.goto('/messages');

    await expect(messages.list.rows).toHaveCount(4);
    await expect(messages.list.name(messages.list.rows.nth(0))).toHaveText('Legacy Financial');
    await expect(messages.list.name(messages.list.rows.nth(1))).toHaveText(
      'Samuel Park · Luzandre.com',
    );
    await expect(messages.list.name(messages.list.rows.nth(3))).toHaveText(
      'Ruth Mensah · Luzandre.com',
    );
    await expect(messages.list.snippet(messages.list.rows.nth(1))).toContainText('Unread.');
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

test.describe('a long inbox (L2-056 AC7)', () => {
  test('AC7: the newest 50 are listed with the counts of the whole inbox, and "Show more conversations" adds the rest', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { rows: manyRows(64) });
    await jb.goto('/messages');

    await expect(messages.subtitle).toHaveText('64 conversations · 2 unread');
    await expect(messages.list.rows).toHaveCount(50);

    await messages.list.showMore.click();

    await expect(messages.list.rows).toHaveCount(64);
    await expect(messages.list.name(messages.list.rows.nth(63))).toHaveText('Business 60');
    await expect(messages.list.moreStatus).toHaveText('14 more conversations shown.');
    await expect(messages.list.showMore).toHaveCount(0);
    expect(fake.pages).toEqual([50]);
    await expect(messages.subtitle).toHaveText('64 conversations · 2 unread');
  });

  test('AC7: with 50 conversations or fewer there is no button', async ({ page, jb }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { rows: manyRows(50) });
    await jb.goto('/messages');

    await expect(messages.list.rows).toHaveCount(50);
    await expect(messages.list.showMore).toHaveCount(0);
  });

  test('AC7: by keyboard the button adds 50 at a time and keeps focus; when it goes, focus is on the first row added', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { rows: manyRows(120) });
    await jb.goto('/messages');
    await expect(messages.list.rows).toHaveCount(50);

    await messages.list.showMore.focus();
    const lastShown = await messages.list.topOf(messages.list.rows.nth(49));
    await page.keyboard.press('Enter');

    await expect(messages.list.rows).toHaveCount(100);
    await expect(messages.list.moreStatus).toHaveText('50 more conversations shown.');
    await expect(messages.list.showMore).toBeFocused();
    // The rows are added below: what was shown has not moved.
    expect(await messages.list.topOf(messages.list.rows.nth(49))).toBe(lastShown);

    await page.keyboard.press('Enter');

    await expect(messages.list.rows).toHaveCount(120);
    await expect(messages.list.showMore).toHaveCount(0);
    await expect(messages.list.rows.nth(100)).toBeFocused();
    expect(fake.pages).toEqual([50, 100]);
  });

  test.describe('on a phone', () => {
    test.use({ hasTouch: true, viewport: { width: 360, height: 760 } });

    test('AC7: the button is pressed by touch and the list grows', async ({ page, jb }) => {
      const messages = new MessagesPage(page);
      await jb.signInAs('member');
      await stubMessaging(page, { rows: manyRows(51) });
      await jb.goto('/messages');
      await expect(messages.list.rows).toHaveCount(50);

      await messages.list.showMore.tap();

      await expect(messages.list.rows).toHaveCount(51);
      await expect(messages.list.moreStatus).toHaveText('1 more conversation shown.');
    });
  });

  test('AC7: while more load the button is busy, says so, and cannot ask twice', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { rows: manyRows(64), paging: 'hang' });
    await jb.goto('/messages');

    await messages.list.showMore.click();

    await expect(messages.list.showMore).toHaveAttribute('aria-busy', 'true');
    await expect(messages.list.moreStatus).toHaveText('Loading more conversations…');
    await messages.list.showMore.click({ force: true });
    expect(fake.pages).toEqual([50]);
  });

  test('AC7: when more cannot be loaded the rows stay, a toast says so and the button tries again', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    const toasts = new Toasts(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { rows: manyRows(64), paging: 'fail' });
    await jb.goto('/messages');

    await messages.list.showMore.click();

    await expect(toasts.withTitle('We couldn’t load more conversations')).toContainText(
      'Try again.',
    );
    await expect(messages.list.rows).toHaveCount(50);

    fake.paging = 'ok';
    await messages.list.showMore.click();

    await expect(messages.list.rows).toHaveCount(64);
  });

  test('AC7: a search is paged the same way', async ({ page, jb }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { rows: manyRows(64) });
    await jb.goto('/messages');
    await expect(messages.list.rows).toHaveCount(50);

    await messages.list.search.fill('business');

    await expect(messages.list.name(messages.list.rows.first())).toHaveText('Business 01');
    await expect(messages.list.rows).toHaveCount(50);
    await messages.list.showMore.click();
    await expect(messages.list.rows).toHaveCount(60);
    await expect(messages.list.showMore).toHaveCount(0);
  });

  test('AC7, L2-070: a new message moves its conversation to the top and keeps the rows already loaded', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { rows: manyRows(64), live: true });
    await jb.goto('/messages');
    await messages.list.showMore.click();
    await expect(messages.list.rows).toHaveCount(64);

    fake.arrive('Are you still looking for a quote?', 'c-60');

    await expect(messages.list.name(messages.list.rows.first())).toHaveText('Business 60');
    await expect(messages.list.rows).toHaveCount(64);
    await expect(messages.list.showMore).toHaveCount(0);
  });

  test('AC7: the list beside an open conversation is paged too', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { rows: manyRows(64) });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.list.rows).toHaveCount(50);

    await conversation.list.showMore.click();

    await expect(conversation.list.rows).toHaveCount(64);
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
    await expect(messages.list.noResults).toContainText('No messages match “roofing”');
    await expect(messages.list.noResults).toContainText(
      'Check the spelling, or search by business name.',
    );

    await messages.list.clearSearch.click();
    await expect(messages.list.rows).toHaveCount(4);
    await expect(messages.list.search).toHaveValue('');
  });

  test('AC1: the search is asked within 300 ms of the last keystroke, once', async ({
    page,
    jb,
  }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages');
    await expect(messages.list.rows).toHaveCount(4);
    const asked = page.waitForRequest((request) => request.url().includes('q=trevor'));

    await messages.list.search.pressSequentially('trevor');
    const lastKey = Date.now();
    await asked;

    expect(Date.now() - lastKey).toBeLessThan(300);
    await expect(messages.list.rows).toHaveCount(1);
    // One request for the whole word, none for the letters on the way.
    expect(fake.searches.filter((q) => q !== null)).toEqual(['trevor']);
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

  test('AC7: the message the member was reading stays where it was when earlier ones are added', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    // A conversation of 100 messages: the latest 50 are open, and 50 more wait above them.
    const fifty = (label: string, from: string) =>
      Array.from({ length: 50 }, (_, index) => ({
        id: `m-${label}-${index}`,
        body: `${label} message ${index + 1}`,
        sentAt: new Date(Date.parse(from) + index * 60_000).toISOString(),
        mine: index % 2 === 0,
        senderFirstName: index % 2 === 0 ? 'Joanna' : 'Trevor',
        attachment: null,
      }));
    await stubMessaging(page, {
      hasMore: true,
      messages: fifty('Later', '2026-11-10T12:00:00Z'),
      earlier: fifty('Earlier', '2026-11-09T14:00:00Z'),
      requests: [],
    });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(50);
    const reading = conversation.bubbles.first();
    await expect(reading).toContainText('Later message 1');
    await expect(conversation.list.rows).toHaveCount(4);
    // The conversation opens at its newest message; the member goes up to the oldest one shown.
    await conversation.settledScreenTop(reading);
    await conversation.showEarlier.focus();
    const before = await conversation.settledScreenTop(reading);
    await expect(reading).toBeInViewport();

    await page.keyboard.press('Enter');

    await expect(conversation.bubbles).toHaveCount(100);
    const stillReading = conversation.bubbles.nth(50);
    await expect(stillReading).toContainText('Later message 1');
    await expect(stillReading).toBeInViewport();
    // Fifty messages were added above it, and it has not moved on the screen.
    await expect
      .poll(() => conversation.screenTop(stillReading))
      .toBeGreaterThanOrEqual(before - 2);
    await expect.poll(() => conversation.screenTop(stillReading)).toBeLessThanOrEqual(before + 2);
    await expect(conversation.bubbles.first()).toContainText('Earlier message 1');
    await expect(conversation.bubbles.first()).not.toBeInViewport();
  });

  test('AC3: a conversation with no message says hello to the owner by first name and offers three openers', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { messages: [], requests: [] });
    await jb.goto('/messages/c-legacy');

    await expect(conversation.sayHello).toContainText('Say hello to Trevor');
    await expect(conversation.sayHello).not.toContainText('Trevor Chew');
    await expect(conversation.sayHello).toContainText('Ask a question or tell them what you need.');
    await expect(conversation.openers).toHaveText([
      'Do you offer a first meeting?',
      'What does it cost?',
      'Can we meet by video?',
    ]);

    await conversation.openers.nth(1).click();
    await expect(conversation.composer).toHaveValue('What does it cost?');
    expect(fake.sends).toEqual([]);

    // By keyboard too: another opener replaces the text, and Enter in the composer sends it.
    await conversation.openers.nth(2).focus();
    await page.keyboard.press('Enter');
    await expect(conversation.composer).toHaveValue('Can we meet by video?');
    await conversation.composer.press('Enter');
    await expect(conversation.bubbles).toHaveCount(1);
    expect(fake.sends[0].body).toBe('Can we meet by video?');
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

test.describe('an owner who is away (L2-062)', () => {
  // The mocks' today is Tuesday 10 November; an away period ends at the start of its day in Toronto.
  const THURSDAY = '2026-11-12T05:00:00Z';

  test('AC1: opening the conversation shows a toast and a line, both with the day the owner is back', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { awayUntil: THURSDAY });
    await jb.goto('/messages/c-legacy');

    const toast = toasts.withTitle('Trevor is away until Thursday');
    await expect(toast).toContainText('They’ll see your message when they’re back.');
    await expect(toasts.info('Trevor is away until Thursday')).toHaveCount(1);
    await expect(conversation.away).toHaveText(
      'Trevor Chew is away until Thursday and will reply when they’re back.',
    );
  });

  test('AC1: a day more than six days ahead is named by its date', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { awayUntil: '2026-11-23T05:00:00Z' });
    await jb.goto('/messages/c-legacy');

    await expect(toasts.withTitle('Trevor is away until Mon 23 Nov')).toHaveCount(1);
    await expect(conversation.away).toContainText('is away until Mon 23 Nov');
  });

  test('AC1: the toast is shown once for a visit: sending does not repeat it, opening again does', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { awayUntil: THURSDAY });
    await jb.goto('/messages/c-legacy');
    const toast = toasts.withTitle('Trevor is away until Thursday');
    await toasts.dismiss(toast).click();
    await expect(toast).toHaveCount(0);

    // The toast is gone, so "Send" is free to press, and sending brings no second toast.
    await conversation.composer.fill('No rush, see you when you’re back.');
    await conversation.send.click();
    await conversation.composer.fill('One more thing.');
    await conversation.send.click();
    await expect(conversation.bubbles).toHaveCount(5);
    await expect(toast).toHaveCount(0);
    await expect(conversation.away).toContainText('is away until Thursday');

    await jb.goto('/messages/c-legacy');
    await expect(toast).toHaveCount(1);
  });

  test('AC1: an owner who goes away while the conversation is open is named by a toast when the next message is sent, by keyboard', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { live: true });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);
    const toast = toasts.withTitle('Trevor is away until Thursday');

    // Trevor sets an away period and writes once more; the open conversation reads itself again.
    fake.awayUntil = THURSDAY;
    fake.arrive('I’m away from tomorrow, back Thursday.');
    await expect(conversation.bubbles).toHaveCount(4);
    await expect(conversation.away).toContainText('is away until Thursday');
    await expect(toast).toHaveCount(0);

    await conversation.composer.fill('Thank you, enjoy the break.');
    await conversation.composer.press('Enter');

    await expect(conversation.bubbles).toHaveCount(5);
    await expect(toast).toHaveCount(1);
    await expect(toast).toContainText('They’ll see your message when they’re back.');

    await toasts.dismiss(toast).click();
    await conversation.composer.fill('See you Thursday.');
    await conversation.composer.press('Enter');
    await expect(conversation.bubbles).toHaveCount(6);
    await expect(toast).toHaveCount(0);
  });

  test('AC2: once the day has come, opening and sending show no away notice', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const toasts = new Toasts(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { awayUntil: THURSDAY });
    // Friday 13 November: the owner came back the day before.
    await jb.goto('/messages/c-legacy', 'light', new Date('2026-11-13T14:00:00Z'));
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.composer.fill('Welcome back');
    await conversation.send.click();

    await expect(conversation.bubbles).toHaveCount(4);
    await expect(toasts.withTitle(/is away/)).toHaveCount(0);
    await expect(conversation.away).toHaveCount(0);
  });

  test('AC2: the day comes before the next message is sent, and it shows no toast', async ({
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
    // The away period becomes known while the conversation is open, so no toast has been shown.
    fake.awayUntil = THURSDAY;
    fake.arrive('I’m away from tomorrow, back Thursday.');
    await expect(conversation.away).toContainText('is away until Thursday');
    // Thursday, 9:00 a.m.: Trevor is back.
    await page.clock.setFixedTime(new Date('2026-11-12T14:00:00Z'));

    await conversation.composer.fill('Welcome back');
    await conversation.send.click();

    await expect(conversation.bubbles).toHaveCount(5);
    await expect(toasts.withTitle(/is away/)).toHaveCount(0);
  });

  test('L2-055 AC3: a first message to an owner who is away opens the conversation, which says so', async ({
    page,
    jb,
  }) => {
    const dialog = new NewMessageDialog(page);
    const toasts = new Toasts(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { awayUntil: THURSDAY });
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('Hello Trevor');
    await dialog.send.click();

    await expect(page).toHaveURL(/\/messages\/c-legacy$/);
    await expect(toasts.withTitle('Trevor is away until Thursday')).toHaveCount(1);
    await expect(toasts.withTitle(/sent/i)).toHaveCount(0);
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

  test('AC9: a photo that did not pass the safety check is not sent, and the bubble says so', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { uploading: 'infected' });
    await jb.goto('/messages/c-legacy');
    await conversation.photoInput.setInputFiles(smallJpeg());
    await conversation.composer.fill('The statement');
    await conversation.send.click();

    const bubble = conversation.bubble('The statement');
    await expect(bubble.time).toContainText('Not sent. This photo didn’t pass our safety check.');
    await expect(bubble.photo).toBeVisible();
    expect(fake.sends).toEqual([]);
    expect(fake.uploads).toEqual([]);

    await bubble.delete.click();
    await expect(conversation.bubbles).toHaveCount(3);
  });

  test('AC9: when the photo cannot be checked the bubble says so, and "Try again" uploads it again and sends once', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { uploading: 'unchecked' });
    await jb.goto('/messages/c-legacy');
    await conversation.photoInput.setInputFiles(smallJpeg());
    await conversation.composer.fill('The statement');
    await conversation.send.click();

    const bubble = conversation.bubble('The statement');
    await expect(bubble.time).toContainText('Not sent. We couldn’t check this photo just now.');
    expect(fake.sends).toEqual([]);

    fake.uploading = 'ok';
    await bubble.tryAgain.focus();
    await page.keyboard.press('Enter');

    await expect(bubble.time).toHaveText('9:00 a.m.');
    expect(fake.uploadAttempts).toBe(2);
    expect(fake.uploads).toHaveLength(1);
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0].attachmentId).toBe('a-1');
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
      'Reports are private. Our team reads this conversation only while the report is open.',
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
      'Your report is private. Our team reviews it within one business day. Legacy Financial is blocked.',
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
      'Your report is private. Our team reviews it within one business day.',
    );
    expect(fake.reports).toEqual([{ reason: 'Spam, three times a day.', block: false }]);
  });

  test('L2-137 AC1: a member who has reported ten conversations today is told how long to wait, and keeps what was typed', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const dialog = new ReportConversationDialog(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { reporting: 'rate-limited' });
    await jb.goto('/messages/c-legacy');
    await conversation.more.click();
    await conversation.menuItem('Report conversation').click();
    await dialog.what.fill('Spam, three times a day.');
    await dialog.send.click();

    await expect(dialog.alert).toContainText('You’re doing that a lot');
    await expect(dialog.alert).toContainText('Try again in 42 minutes.');
    await expect(dialog.alert).not.toContainText('connection');
    await expect(dialog.what).toHaveValue('Spam, three times a day.');
    expect(fake.reports).toEqual([]);
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
    await expect(failed.root).toContainText('Can we do Thursday?');
    await expect(failed.delete).toBeVisible();

    fake.delivery = 'ok';
    await failed.tryAgain.click();

    await expect(conversation.bubble('Can we do Thursday?').time).toHaveText('9:00 a.m.');
    expect(fake.sends).toHaveLength(1);
    expect(fake.sends[0].body).toBe('Can we do Thursday?');
    // Two tries reached the API, and the second carried the key of the first.
    expect(fake.attempts).toHaveLength(2);
    expect(fake.attempts[1].idempotencyKey).toBe(fake.attempts[0].idempotencyKey);
    expect(fake.attempts[0].idempotencyKey).toMatch(/^[\w-]{8,}$/);
  });

  test('AC1: when the server confirms, the time takes the place of "Sending…" and nothing moves', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page, { delivery: 'held' });
    await jb.goto('/messages/c-legacy');
    await expect(conversation.bubbles).toHaveCount(3);

    await conversation.composer.fill('Should I bring last year’s tax return?');
    await conversation.send.click();
    const bubble = conversation.bubble('Should I bring');
    await expect(bubble.status).toHaveText('Sending…');
    const sending = await conversation.pageBox(bubble.root);
    const composerWhileSending = await conversation.pageBox(conversation.composerForm);

    fake.delivery = 'ok';
    fake.release();

    await expect(bubble.time).toHaveText('9:00 a.m.');
    expect(await conversation.pageBox(bubble.root)).toEqual(sending);
    expect(await conversation.pageBox(conversation.composerForm)).toEqual(composerWhileSending);
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

    await expect(conversation.bubble('Hello again').time).toContainText(
      'Not sent. You’re doing that a lot. Try again in 1 minute.',
    );
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
    await expect(dialog.messageLabel).toHaveText('Your message (required)');
    await expect(dialog.hint).toHaveText('Be specific and Trevor can answer in one reply.');
    await expect(dialog.counter).toHaveCount(0);
  });

  test('AC5: typing stops at 4,000 characters, and a counter shows for the last 200', async ({
    page,
    jb,
  }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(360);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('a'.repeat(3799));
    await expect(dialog.counter).toHaveCount(0);

    await page.keyboard.type('b');
    await expect(dialog.counter).toHaveText('200 characters left');

    await dialog.message.fill('a'.repeat(3998));
    await page.keyboard.type('b');
    await expect(dialog.counter).toHaveText('1 character left');

    // Three more keys: only the first fits.
    await page.keyboard.type('cde');
    await expect(dialog.counter).toHaveText('0 characters left');
    await expect(dialog.message).toHaveValue(`${'a'.repeat(3998)}bc`);

    await dialog.send.click();
    await expect(page).toHaveURL(/\/messages\/c-legacy$/);
    expect(fake.starts[0].body).toHaveLength(4000);
  });

  test('L2-137 AC1: starting conversations too fast says how long to wait and keeps the text', async ({
    page,
    jb,
  }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    await stubMessaging(page, { delivery: 'rate-limited' });
    await jb.goto('/b/legacy-financial/message');

    await dialog.message.fill('Hello Trevor');
    await dialog.send.click();

    await expect(dialog.alert).toContainText('You’re doing that a lot');
    await expect(dialog.alert).toContainText('Try again in 1 minute.');
    await expect(dialog.message).toHaveValue('Hello Trevor');
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

  test('AC5: more than 4,000 characters, put there past the limit, is not sent', async ({
    page,
    jb,
  }) => {
    const dialog = new NewMessageDialog(page);
    await new BusinessPage(page).setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');

    await dialog.putPastTheLimit('a'.repeat(4001));
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
    await expect(dialog.alert).toContainText(
      'Your connection dropped before it reached us. Nothing was sent and what you typed is still here. Try again.',
    );
    await expect(dialog.message).toHaveValue('Hello Trevor');
    const firstKey = fake.attempts[0].idempotencyKey;

    fake.delivery = 'ok';
    await dialog.send.click();

    await expect(page).toHaveURL(/\/messages\/c-legacy$/);
    expect(fake.starts).toHaveLength(1);
    expect(fake.starts[0].idempotencyKey).toBe(firstKey);
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
