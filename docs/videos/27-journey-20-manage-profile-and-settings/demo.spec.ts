import { LISTING_ID, stubAdmin } from '../../../e2e/fixtures/admin';
import { test } from '../../../e2e/fixtures/demo';
import { stubProfile } from '../../../e2e/fixtures/profile';
import { AccountPage } from '../../../e2e/pages/account.page';
import { AdminListingPage } from '../../../e2e/pages/admin-listing.page';

// Video 27: journey 20, manage profile and settings (ADR 0028, ADR 0065). The member's account with
// the home church address and pronouns, "Where you're signed in" with one device signed out on its
// own, and the owner's pronouns in the Owner panel of the admin application. The app is answered by
// the stand-ins of the behaviour specs (`e2e/fixtures/profile.ts`, `e2e/fixtures/admin.ts`,
// ADR 0009). Cards say what only the tests prove. Built by `node tools/video-demo/build.mjs`
// (docs/videos/README.md).

test('journey 20: manage profile and settings', async ({ demo }) => {
  const page = demo.page;
  const account = new AccountPage(page);
  const listing = new AdminListingPage(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  await demo.jb.signInAs('member');
  await stubProfile(page, { account: { pronouns: 'she/her' } });
  await demo.jb.goto('/account');
  await account.firstName.waitFor({ timeout: 15_000 });
  await demo.card('Journey 20 · Manage profile and settings', [
    'Edit the profile, change e-mail or password, choose which e-mails arrive.',
    'This run: from 93% to 100%.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('profile', async () => {
    await demo.point(account.homeChurchAddress);
    await demo.pause(800);
    await demo.point(account.homeChurchAddressHint);
    await demo.pause(1200);
    await demo.point(account.pronouns);
    await demo.pause(800);
    await demo.point(account.pronounsHint);
    await demo.pause(1200);
  });

  await demo.scene('sessions', async () => {
    await account.sessionsCard.scrollIntoViewIfNeeded();
    await demo.point(account.sessionsCard.getByRole('heading'));
    await demo.pause(800);
    await demo.point(account.sessionRow('Safari on iPhone'));
    await demo.pause(1500);
    await demo.point(account.sessionRow('Chrome on Windows'));
    await demo.pause(2000);
  });

  await demo.scene('end', async () => {
    await demo.click(account.signOutDevice('Chrome on Windows'));
    await account.noOtherDevices.waitFor({ timeout: 10_000 });
    await demo.point(account.noOtherDevices);
    await demo.pause(1500);
    await demo.point(account.sessionRow('Safari on iPhone'));
    await demo.pause(1000);
  });

  await stubAdmin(page);
  await demo.jb.gotoAdmin(`/listings/${LISTING_ID}`);
  await listing.heading.waitFor({ timeout: 15_000 });
  await demo.scene('team', async () => {
    await demo.point(listing.ownerRow('Name'));
    await demo.pause(800);
    await demo.point(listing.ownerRow('Pronouns'));
    await demo.pause(2500);
  });

  await park();
  await demo.card('Behind the screen', [
    'Each password change, e-mail change request and e-mail change is logged with the member, the address and the outcome, a refused one too (AccountSettingsTests, L2-143 AC1).',
    'Another member’s session answers 404, changes nothing and the attempt is logged (AccountSessionsTests, L2-133 AC2).',
    'A business, the other side of a conversation, the Jubilee team and the public are given neither the home church nor its address (MemberPrivacyTests, L2-196 AC7).',
  ]);
  await demo.scene('behind');

  await demo.card('Journey 20 · complete', [
    'Members see where they are signed in and sign any other device out.',
    'The daily summary and promotional e-mail were built with journey 17.',
  ]);
  await demo.scene('close');
});
