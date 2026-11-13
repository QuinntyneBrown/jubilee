import { test } from '../../../e2e/fixtures/demo';
import { RESET_EMAIL, stubPasswordReset } from '../../../e2e/fixtures/password-reset';
import { ForgotPasswordPage } from '../../../e2e/pages/forgot-password.page';
import { ResetPasswordPage } from '../../../e2e/pages/reset-password.page';

// Video 26: journey 18, recover a forgotten password (ADR 0026, ADR 0064). A visitor asks for a reset
// link, asks too often and is told when to try again, then opens the link, is refused a short
// password and chooses a good one. The app is answered by the stand-in of the behaviour spec
// (`e2e/fixtures/password-reset.ts`, ADR 0009). Cards say what only the tests prove. Built by
// `node tools/video-demo/build.mjs` (docs/videos/README.md).

const TOKEN = 'e2e-reset-token-0123456789abcdefghijklmnopq';

test('journey 18: recover a forgotten password', async ({ demo }) => {
  const page = demo.page;
  const forgot = new ForgotPasswordPage(page);
  const reset = new ResetPasswordPage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  const fake = await stubPasswordReset(page);
  await demo.jb.goto('/forgot-password');
  await forgot.heading.waitFor({ timeout: 15_000 });
  await demo.card('Journey 18 · Recover a forgotten password', [
    'A member asks for a reset link by e-mail and chooses a new password.',
    'This run: from 90% to 100%.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('ask', async () => {
    await demo.type(forgot.email, RESET_EMAIL);
    await demo.click(forgot.send);
    await forgot.sentHeading.waitFor({ timeout: 10_000 });
    await demo.point(forgot.sentText);
    await demo.pause(1500);
  });

  // The same address, three requests later in the hour.
  fake.request = 'rate-limited';
  await demo.jb.goto('/forgot-password');
  await forgot.heading.waitFor({ timeout: 15_000 });
  await demo.scene('limit', async () => {
    await demo.type(forgot.email, RESET_EMAIL);
    await demo.click(forgot.send);
    await forgot.notice.waitFor({ timeout: 10_000 });
    await demo.point(forgot.notice);
    await demo.pause(2000);
    await demo.point(forgot.email);
  });

  await demo.jb.goto(`/reset-password/${TOKEN}`);
  await reset.heading.getByText('Choose a new password').waitFor({ timeout: 15_000 });
  await demo.scene('open', async () => {
    await demo.point(reset.heading);
    await demo.pause(800);
    await demo.point(reset.forAccount);
    await demo.pause(1500);
  });

  await demo.scene('short', async () => {
    await demo.type(reset.password, 'short');
    await demo.type(reset.repeat, 'short');
    await demo.click(reset.change);
    await reset.passwordError.waitFor({ timeout: 10_000 });
    await demo.point(reset.passwordError);
    await demo.pause(1500);
  });

  await demo.scene('changed', async () => {
    await reset.password.fill('');
    await reset.repeat.fill('');
    await demo.type(reset.password, 'a brand new password 7');
    await demo.type(reset.repeat, 'a brand new password 7');
    await demo.click(reset.change);
    await reset.heading.getByText('Password changed').waitFor({ timeout: 10_000 });
    await demo.point(reset.heading);
    await demo.pause(2000);
  });

  await park();
  await demo.card('Behind the screen', [
    'A fourth request for one address in an hour answers 429 with Retry-After; it counts requests, never the account (PasswordResetTests, L2-008 AC4, L2-137 AC1).',
    'The median answer of 100 requests each, with and without an account, differs by less than 50 ms (L2-008 AC5).',
    'No reset token reaches the API’s or the worker’s log (TokenRedactionTests, PasswordResetJobTests, L2-140 AC3).',
    'More than 100 reset requests in 5 minutes e-mail the on-call contact the count, never an address (PasswordResetAlertTests, L2-143 AC4).',
  ]);
  await demo.scene('behind');

  await demo.card('Journey 18 · complete', [
    'Reset requests are limited without revealing who has an account.',
    'Owner step: set Security__OnCallEmail; until then the Jubilee team is alerted.',
  ]);
  await demo.scene('close');
});
