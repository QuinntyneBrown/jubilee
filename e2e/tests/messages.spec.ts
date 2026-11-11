import { expect, test } from '../fixtures/jb-test';
import { stubMessaging } from '../fixtures/messaging';
import { BusinessPage } from '../pages/business.page';
import { NotFoundPage } from '../pages/not-found.page';
import { ConversationPage, MessagesPage, NewMessageDialog } from '../pages/messages.page';
import { SignInRequiredDialog } from '../pages/sign-in-required.dialog';

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
    await expect(conversation.list.row('Legacy Financial')).toHaveAttribute(
      'aria-current',
      'page',
    );
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

test.describe('send a message (L2-058)', () => {
  test('AC1: it appears at once as "Sending…" and the composer clears', async ({
    page,
    jb,
  }) => {
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

  test('AC2, AC5: an empty message is not sent and the field says what to do', async ({ page, jb }) => {
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
  test('the Messages entry of the top bar counts the unread conversations', async ({ page, jb }) => {
    const messages = new MessagesPage(page);
    await messages.setWidth(1280);
    await jb.signInAs('member', { unreadConversationCount: 2 });
    await stubMessaging(page);
    await jb.goto('/messages');

    await expect(messages.badgeIn(messages.topBarLink(/^Messages/))).toHaveText('2');
  });
});
