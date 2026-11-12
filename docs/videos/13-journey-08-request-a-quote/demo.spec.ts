import { test } from '../../../e2e/fixtures/demo';
import { stubProfile } from '../../../e2e/fixtures/profile';
import { stubQuote } from '../../../e2e/fixtures/quote';
import { AccountPage } from '../../../e2e/pages/account.page';
import { BusinessPage } from '../../../e2e/pages/business.page';
import { RequestQuoteDialog } from '../../../e2e/pages/messages.page';

// Video 13: journey 8, request a quote. A member whose profile has a phone number asks
// Luzandre.com for a quote: the dialog starts with that number, she gives another for this job and
// sends it, and her account still shows her own. The app is answered by the recorded API and the
// profile and quote stand-ins of the behaviour specs (ADR 0009); two cards say what the run did
// behind the screen. Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

const NEED = 'Two hundred tees and sixty mugs for our church’s 25th anniversary.';

test('journey 8: request a quote', async ({ demo }) => {
  const account = new AccountPage(demo.page);
  const business = new BusinessPage(demo.page);
  const dialog = new RequestQuoteDialog(demo.page);

  // Joanna's profile has the phone 416-555-0142, and the quote options carry it.
  await demo.jb.signInAs('member');
  await stubProfile(demo.page);
  await stubQuote(demo.page, { phone: '416-555-0142' });
  await demo.jb.goto('/account');
  await account.phone.waitFor();
  await demo.card('Journey 8 · Request a quote', [
    'A member describes a job and asks a business for a quote.',
    'This run: from 95% to 100%.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('profile', async () => {
    await demo.point(account.phone);
  });

  await demo.jb.goto('/b/luzandre');
  await business.heading.waitFor();
  const ask = business.serviceRows
    .filter({ hasText: 'Custom design consultation' })
    .getByRole('link');
  await demo.scene('dialog', async () => {
    await demo.point(ask);
    await demo.pause(1800);
    await demo.click(ask);
    await dialog.title.waitFor();
    await demo.pause(1500);
    await demo.point(dialog.phone);
    await demo.pause(2500);
    await demo.point(dialog.phoneHelp);
  });

  await demo.scene('change', async () => {
    await demo.type(dialog.what, NEED);
    await demo.click(dialog.phone);
    await demo.page.keyboard.press('ControlOrMeta+A');
    await dialog.phone.pressSequentially('647-555-0199', { delay: 60 });
    await demo.pause(600);
    await demo.click(dialog.send);
    await dialog.viewRequest.waitFor();
  });

  await demo.scene('sent', async () => {
    await demo.point(dialog.description);
  });

  await demo.jb.goto('/account');
  await account.phone.waitFor();
  await demo.scene('unchanged', async () => {
    await demo.point(account.phone);
  });

  await demo.page.mouse.move(1240, 700);
  await demo.card('Behind the screen', [
    'GET /api/listings/{slug}/quote answers the caller’s own profile phone, or none. Nobody gets another member’s.',
    'What is sent is kept on the request; the profile is never written. A restored draft wins over the prefill.',
    'The owner: a notification “New quote request from {member}”, an e-mail, the request under New.',
    'The member: a notification when the owner confirms or declines; a quote card in the conversation.',
    'Proved by QuoteTests and request-quote.spec.ts.',
  ]);
  await demo.scene('behind');

  await demo.card('Journey 8 · 100%', [
    'Done: the phone prefilled from the profile, and the notifications and the card asserted.',
    'Nothing is left for the owner. Out of scope, always: prices and payment. Jubilee takes no payment.',
  ]);
  await demo.scene('close');
});
