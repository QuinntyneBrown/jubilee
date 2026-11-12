import { test } from '../../../e2e/fixtures/demo';
import { stubMessaging } from '../../../e2e/fixtures/messaging';
import { stubProfile } from '../../../e2e/fixtures/profile';
import { stubSaved } from '../../../e2e/fixtures/saved';
import {
  PASSWORD,
  joannaSession,
  refuseAsExpired,
  stubSession,
} from '../../../e2e/fixtures/session';
import { AccountPage } from '../../../e2e/pages/account.page';
import { BusinessPage } from '../../../e2e/pages/business.page';
import { NewMessageDialog } from '../../../e2e/pages/messages.page';
import { SignInRequiredDialog } from '../../../e2e/pages/sign-in-required.dialog';
import { AccountMenuRegion, SessionExpiredPage, SignInPage } from '../../../e2e/pages/sign-in.page';
import { SignOutOthersDialog } from '../../../e2e/pages/sign-out-others.dialog';
import { Toasts } from '../../../e2e/pages/toasts';

// Video 06: journey 5, sign in and out. A visitor is brought back to the action they started, a
// member's message survives the end of the session, and the account page signs the other devices
// out, against the stubs of return-to-origin.spec.ts, drafts.spec.ts and sign-out-others.spec.ts
// (ADR 0009); the cards say what the run proved behind the screen. Built by
// `node tools/video-demo/build.mjs` (docs/videos/README.md).

const QUESTION = 'Hello Trevor, do you help newcomers set up RESPs for their children?';

test('journey 5: sign in and out', async ({ demo }) => {
  const page = demo.page;
  const business = new BusinessPage(page);
  const prompt = new SignInRequiredDialog(page);
  const signIn = new SignInPage(page);
  const message = new NewMessageDialog(page);
  const expired = new SessionExpiredPage(page);
  const toasts = new Toasts(page);
  const account = new AccountPage(page);
  const others = new SignOutOthersDialog(page);
  const menu = new AccountMenuRegion(page);
  const signInAsJoanna = async () => {
    await demo.type(signIn.email, joannaSession.email);
    await demo.type(signIn.password, PASSWORD);
    await demo.click(signIn.signIn);
  };
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  // A visitor: nobody is signed in until the sign-in form is sent.
  await stubSession(page);
  await stubMessaging(page);
  await demo.jb.goto('/b/legacy-financial');
  await business.messageLink.waitFor();
  await demo.card('Journey 5 · Sign in and out', [
    'A member signs in, stays signed in safely, and signs out.',
    'This run: from 76% to complete.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('prompt', async () => {
    await demo.click(business.messageLink);
    await prompt.title.waitFor();
    await demo.point(prompt.title);
    await demo.pause(1500);
    await demo.point(prompt.signIn);
  });

  await demo.scene('return', async () => {
    await demo.click(prompt.signIn);
    await signInAsJoanna();
    await message.title.waitFor();
    await demo.point(message.title);
  });

  // Another visitor, on another listing: the heart.
  await stubSession(page);
  await stubSaved(page, { items: [] });
  await demo.scene('save', async () => {
    await demo.jb.goto('/b/luzandre');
    await demo.click(business.saveButton);
    await prompt.title.waitFor();
    await demo.click(prompt.signIn);
    await signIn.signInWith(joannaSession.email, PASSWORD);
    await toasts.withTitle('Saved Luzandre.com. Find it any time under Saved.').waitFor();
    await demo.point(business.saveButton);
    await demo.pause(2500);
  });

  // A member writes a message; the server ends the session before it is sent.
  const session = await stubSession(page, { signedIn: true });
  await stubMessaging(page);
  await demo.scene('typed', async () => {
    await demo.jb.goto('/b/legacy-financial/message');
    await message.message.waitFor();
    await demo.type(message.message, QUESTION);
  });

  session.expire();
  await refuseAsExpired(page, '**/api/conversations');
  await demo.scene('expired', async () => {
    await demo.click(message.send);
    await expired.heading.waitFor();
    await demo.point(expired.heading);
    await demo.pause(1500);
    await demo.point(expired.signIn);
  });

  await page.unroute('**/api/conversations');
  await stubMessaging(page);
  await demo.scene('restored', async () => {
    await demo.click(expired.signIn);
    await signInAsJoanna();
    await message.message.waitFor();
    await demo.point(message.message);
    await demo.pause(1200);
    await demo.point(toasts.withTitle('We kept what you typed'));
  });

  // The dialog is drawn above everything else on the page: it closes before the card covers it.
  await message.cancel.click();
  await message.root.waitFor({ state: 'detached' });
  await park();
  await demo.card('A draft is kept on the device, never on the server', [
    'FormDraftDirective (jbDraft) makes a form a draft source; DraftRegistry saves the sources of the page when the session ends or the member signs out; DraftStore keeps them for 30 days.',
    'L2-116 AC3, AC4: restored once, to the member who typed it; no password, no file; removed when a different member signs in.',
    'drafts.spec.ts and drafts-forms.spec.ts: the message, the reply box, booking, quote, order and space requests, a bug report, the profile, a listing and a decline message.',
  ]);
  await demo.scene('drafts');

  await stubSession(page, { signedIn: true, otherSessionCount: 1 });
  await stubProfile(page);
  await demo.jb.goto('/account');
  await account.signedInOn.waitFor();
  await demo.scene('account', async () => {
    await demo.point(account.signedInOn);
    await demo.pause(2500);
    await demo.click(account.signOutOthers);
    await others.title.waitFor();
    await demo.point(others.description);
  });

  await demo.scene('others', async () => {
    await demo.click(others.confirm);
    await toasts.withTitle('Your other devices were signed out').waitFor();
    await demo.point(account.signedInOn);
  });

  await demo.scene('sign-out', async () => {
    await demo.click(account.signOut);
    await menu.confirmTitle.waitFor();
    await demo.point(menu.confirmTitle);
    await demo.pause(2500);
    await demo.click(menu.confirmSignOut);
    await page.waitForURL('**/welcome');
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  await park();
  await demo.card('Several refused calls, one session-expired page', [
    'sessionExpiredInterceptor keeps the drafts, ends the member in the app, closes the open dialogs and navigates once; the calls that follow find nobody signed in.',
    'L2-116 AC2: together or one after another, the page opens once and returns to the page the member was on.',
    'sign-in.spec.ts: "several calls refused for one ended session".',
  ]);
  await demo.scene('once');

  await demo.card('__Host-jubilee.session, and no other origin', [
    'L2-135 AC1: outside Development the cookie is __Host-jubilee.session: Secure, HttpOnly, SameSite=Lax, Path=/. Development, on plain HTTP, keeps jubilee.session.',
    'L2-135 AC3: the allowlist of origins is empty. No Access-Control-Allow-Origin, no approved preflight.',
    'SessionCookieTests.cs, 17 test cases, through the API’s own endpoints.',
  ]);
  await demo.scene('cookie');

  await demo.card('Journey 5 is complete', [
    'ADR 0046 records the decisions; L2-010, L2-011, L2-012, L2-116 and L2-135 and the three designs describe the code as built.',
    'Left for the owner: the visual, responsive and accessibility sweeps.',
    'Elsewhere: the list of sessions with location (journey 20), token redaction in logs (journey 4), staff sign-in (journey 30).',
  ]);
  await demo.scene('close');
});
