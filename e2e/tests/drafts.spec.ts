import { expect, test } from '../fixtures/jb-test';
import { stubMessaging } from '../fixtures/messaging';
import {
  PASSWORD,
  joannaSession,
  naomiSession,
  refuseAsExpired,
  stubSession,
} from '../fixtures/session';
import { BusinessPage } from '../pages/business.page';
import { ConversationPage, NewMessageDialog } from '../pages/messages.page';
import { AccountMenuRegion, SessionExpiredPage, SignInPage } from '../pages/sign-in.page';
import { Toasts } from '../pages/toasts';

// Drafts (L2-010 AC4, L2-011 AC3, L2-116): what a member typed is kept on the device when the
// session ends or the member signs out, and restored to the same member. The API is answered by
// Playwright mocking (ADR 0009).

const EMAIL = joannaSession.email;
const QUESTION = 'Hello Trevor, do you help newcomers set up RESPs for their children?';
const KEPT = 'We kept what you typed';

test.describe('a message kept when the session ends (L2-116, L2-010 AC4)', () => {
  test('AC1, AC3: the message typed before the session ended is back after signing in, said so, and not sent', async ({
    page,
    jb,
  }) => {
    const dialog = new NewMessageDialog(page);
    const expired = new SessionExpiredPage(page);
    const toasts = new Toasts(page);
    await new BusinessPage(page).setWidth(1280);
    const session = await stubSession(page, { signedIn: true });
    await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');
    await dialog.message.fill(QUESTION);

    // The session ends on the server; the send is the first call to learn of it.
    session.expire();
    const refused = await refuseAsExpired(page, '**/api/conversations');
    await dialog.send.click();

    await expect.poll(() => expired.dataPage()).toBe('session-expired');
    await expect(expired.signIn).toHaveAttribute(
      'href',
      '/sign-in?returnUrl=%2Fb%2Flegacy-financial%2Fmessage',
    );
    await page.unroute('**/api/conversations');
    await stubMessaging(page);
    await expired.signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);

    await expect(dialog.title).toHaveText('Message Legacy Financial');
    await expect(dialog.message).toHaveValue(QUESTION);
    const toast = toasts.withTitle(KEPT);
    await expect(toast).toContainText('Check it over, then send it when you’re ready.');
    expect(refused.count).toBe(1);
  });

  test('AC3: a draft is restored once: the form opened again later is empty', async ({
    page,
    jb,
  }) => {
    const dialog = new NewMessageDialog(page);
    const expired = new SessionExpiredPage(page);
    await new BusinessPage(page).setWidth(1280);
    const session = await stubSession(page, { signedIn: true });
    await stubMessaging(page);
    await jb.goto('/b/legacy-financial/message');
    await dialog.message.fill(QUESTION);
    session.expire();
    await refuseAsExpired(page, '**/api/conversations');
    await dialog.send.click();
    await expect.poll(() => expired.dataPage()).toBe('session-expired');
    await expired.signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);
    await expect(dialog.message).toHaveValue(QUESTION);
    const toasts = new Toasts(page);

    await dialog.cancel.click();
    await expect(dialog.root).toHaveCount(0);
    await toasts.dismiss(toasts.withTitle(KEPT)).click();
    await new BusinessPage(page).messageLink.click();

    await expect(dialog.title).toHaveText('Message Legacy Financial');
    await expect(dialog.message).toHaveValue('');
    await expect(new Toasts(page).withTitle(KEPT)).toHaveCount(0);
  });
});

const REPLY = 'Thursday at 10 works. Should I bring last year’s tax return?';
const mute = '**/api/conversations/*/mute';

/** Ends the session on the server and lets the conversation learn of it from its menu. */
async function expireFromTheMenu(
  page: import('@playwright/test').Page,
  session: { expire(): void },
): Promise<void> {
  const conversation = new ConversationPage(page);
  session.expire();
  await refuseAsExpired(page, mute);
  await conversation.more.click();
  await conversation.menuItem('Mute').click();
  await expect.poll(() => new SessionExpiredPage(page).dataPage()).toBe('session-expired');
  await page.unroute(mute);
}

test.describe('the message composer keeps its draft (L2-116, L2-010 AC4)', () => {
  test('AC1: a reply being written when any call learns the session ended is back after signing in', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const expired = new SessionExpiredPage(page);
    await conversation.setWidth(1280);
    const session = await stubSession(page, { signedIn: true });
    const messaging = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.composer.fill(REPLY);

    await expireFromTheMenu(page, session);
    await expect(expired.signIn).toHaveAttribute(
      'href',
      '/sign-in?returnUrl=%2Fmessages%2Fc-legacy',
    );
    await expired.signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);

    await expect(conversation.composer).toHaveValue(REPLY);
    await expect(new Toasts(page).withTitle(KEPT)).toBeVisible();
    // Nothing is sent without a press; pressing Send sends what was restored.
    const before = messaging.messages.length;
    await conversation.send.click();
    await expect(conversation.composer).toHaveValue('');
    await expect.poll(() => messaging.messages.length).toBe(before + 1);
    expect(messaging.messages.at(-1)!.body).toBe(REPLY);
  });

  test('AC1: a composer with nothing typed leaves no draft and no notice', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    const session = await stubSession(page, { signedIn: true });
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.composer.fill(REPLY);
    await conversation.composer.fill('');

    await expireFromTheMenu(page, session);
    await new SessionExpiredPage(page).signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);

    await expect(conversation.composer).toBeVisible();
    await expect(conversation.composer).toHaveValue('');
    await expect(new Toasts(page).withTitle(KEPT)).toHaveCount(0);
  });

  test('AC4: a draft older than 30 days is not restored', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    const session = await stubSession(page, { signedIn: true });
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.composer.fill(REPLY);
    await expireFromTheMenu(page, session);

    await page.clock.setFixedTime(new Date('2026-12-11T09:00:00-05:00'));
    await new SessionExpiredPage(page).signIn.click();
    await new SignInPage(page).signInWith(EMAIL, PASSWORD);

    await expect(conversation.composer).toBeVisible();
    await expect(conversation.composer).toHaveValue('');
    await expect(new Toasts(page).withTitle(KEPT)).toHaveCount(0);
  });

  test('AC4: the draft kept on the device holds the text, and neither the e-mail address nor a chosen photo', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await conversation.setWidth(1280);
    const session = await stubSession(page, { signedIn: true });
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.composer.fill(REPLY);
    await conversation.photoInput.setInputFiles({
      name: 'leak.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await expect(conversation.attachedPhoto).toBeVisible();

    await expireFromTheMenu(page, session);

    const kept = await conversation.keptDrafts();
    expect(kept).toHaveLength(1);
    expect(kept[0].address).toBe('/messages/c-legacy');
    expect(kept[0].values).toEqual({ message: REPLY });
    expect(JSON.stringify(kept)).not.toContain(EMAIL);
    expect(JSON.stringify(kept)).not.toContain('leak.png');
  });
});

test.describe('a draft and signing out (L2-011 AC3)', () => {
  test('AC3: an unsent message is kept at sign-out and restored when the same member signs in again', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const menu = new AccountMenuRegion(page);
    const signIn = new SignInPage(page);
    await conversation.setWidth(1280);
    await stubSession(page, { signedIn: true });
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.composer.fill(REPLY);

    await conversation.avatar.click();
    await menu.signOut.click();
    await menu.confirmSignOut.click();
    await expect.poll(() => conversation.dataPage()).toBe('welcome');

    await jb.goto('/sign-in?returnUrl=%2Fmessages%2Fc-legacy');
    await signIn.signInWith(EMAIL, PASSWORD);

    await expect(conversation.composer).toHaveValue(REPLY);
    await expect(new Toasts(page).withTitle(KEPT)).toBeVisible();
  });

  test('AC3: the draft is not shown to a different member, and is gone when its writer returns', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const menu = new AccountMenuRegion(page);
    const signIn = new SignInPage(page);
    await conversation.setWidth(1280);
    const session = await stubSession(page, { signedIn: true });
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.composer.fill(REPLY);
    await conversation.avatar.click();
    await menu.signOut.click();
    await menu.confirmSignOut.click();
    await expect.poll(() => conversation.dataPage()).toBe('welcome');

    // Naomi signs in on the same device.
    session.member = naomiSession;
    await jb.goto('/sign-in?returnUrl=%2Fmessages%2Fc-legacy');
    await signIn.signInWith(naomiSession.email, PASSWORD);
    await expect(conversation.composer).toBeVisible();
    await expect(conversation.composer).toHaveValue('');
    await expect(new Toasts(page).withTitle(KEPT)).toHaveCount(0);
    expect(await conversation.keptDrafts()).toEqual([]);

    // Joanna comes back: what she typed left the device when Naomi signed in.
    await conversation.avatar.click();
    await menu.signOut.click();
    await menu.confirmSignOut.click();
    await expect.poll(() => conversation.dataPage()).toBe('welcome');
    session.member = joannaSession;
    await jb.goto('/sign-in?returnUrl=%2Fmessages%2Fc-legacy');
    await signIn.signInWith(EMAIL, PASSWORD);
    await expect(conversation.composer).toBeVisible();
    await expect(conversation.composer).toHaveValue('');
  });
});
