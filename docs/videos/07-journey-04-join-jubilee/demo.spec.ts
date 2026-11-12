import { test } from '../../../e2e/fixtures/demo';
import { stubResendLimited, stubUnconfirmedEmailChange } from '../../../e2e/fixtures/stubs';
import { ChangeUnconfirmedEmailDialog } from '../../../e2e/pages/change-unconfirmed-email.dialog';
import { VerifyEmailBannerRegion } from '../../../e2e/pages/verify-email.page';

// Video 07: journey 4, join Jubilee. An unconfirmed member changes a mistyped address in the
// dialog, meets an address in use and the resend limit, against the recorded API and the stubs of
// the behaviour spec (ADR 0009); two cards say what the run did behind the screen. Built by
// `node tools/video-demo/build.mjs` (docs/videos/README.md).

test('journey 4: join Jubilee', async ({ demo }) => {
  const banner = new VerifyEmailBannerRegion(demo.page);
  const dialog = new ChangeUnconfirmedEmailDialog(demo.page);

  // Joanna has joined and has not confirmed her address yet (L2-005 AC1).
  await demo.jb.open('verify-email-banner');
  await banner.banner.waitFor();
  await demo.card('Journey 4 · Join Jubilee', [
    'A visitor creates an account by e-mail or Google and confirms the address.',
    'This run: from 89% to 98%.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('banner', async () => {
    await demo.point(banner.banner);
    await demo.pause(1200);
    await demo.point(banner.sendAgain);
  });

  // The API replaces the address and the session then reports the new one (L2-004 AC5).
  await stubUnconfirmedEmailChange(demo.page, 'replaced');
  await demo.scene('dialog', async () => {
    await demo.click(banner.changeEmail);
    await dialog.title.waitFor();
    await demo.point(dialog.description);
    await demo.type(dialog.email, 'joanna@adeyemi.example');
  });

  await demo.scene('sent', async () => {
    await demo.click(dialog.send);
    await dialog.done.waitFor();
    await demo.point(dialog.description);
    await demo.pause(2200);
    await demo.click(dialog.done);
    await demo.point(banner.banner);
  });

  // The API answers the same for an address in use; the session keeps the address (L2-004 AC9).
  await stubUnconfirmedEmailChange(demo.page, 'in-use');
  await demo.scene('taken', async () => {
    await demo.click(banner.changeEmail);
    await dialog.title.waitFor();
    await demo.type(dialog.email, 'david.chen@example.com');
    await demo.click(dialog.send);
    await dialog.emailError.waitFor();
    await demo.point(dialog.emailError);
    await demo.pause(2500);
    await demo.click(dialog.cancel);
  });

  // The sixth resend of the hour: 429 with 42 minutes to wait (L2-005 AC5).
  await stubResendLimited(demo.page);
  await demo.scene('limit', async () => {
    await demo.click(banner.sendAgain);
    await demo.point(banner.banner);
  });

  await demo.card('Behind the screen', [
    'A token in a request path is logged as [redacted] (LoggedPath, L2-140 AC3).',
    'It was written in full for a data download and for an unsubscribe link.',
    'Confirmation and reset tokens travel in request bodies, which are never logged.',
    'Proved by TokenRedactionTests, which reads the captured log.',
  ]);
  await demo.scene('behind');

  await demo.card('Journey 4 · 98%', [
    'Done: the unconfirmed address in a dialog, the resend limit shown, tokens out of the logs.',
    'Left for the owner: BotChallenge__SiteKey and BotChallenge__SecretKey in Azure (eng/azure/README.md).',
  ]);
  await demo.scene('close');
});
