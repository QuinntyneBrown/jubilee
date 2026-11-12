import { LISTING_ID, stubAdmin } from '../../../e2e/fixtures/admin';
import { test } from '../../../e2e/fixtures/demo';
import { stubListingDrafts } from '../../../e2e/fixtures/listing-drafts';
import { stubMyBusiness } from '../../../e2e/fixtures/my-business';
import {
  STATEMENT_LAPSED,
  naomiOwing,
  stubStatementAgreement,
} from '../../../e2e/fixtures/statement-of-faith';
import { AdminVerificationPage } from '../../../e2e/pages/admin-verification.page';
import { ListBusinessPage } from '../../../e2e/pages/list-business.page';
import { MyBusinessPage } from '../../../e2e/pages/my-business.page';
import { ServiceEditorDialog } from '../../../e2e/pages/service-editor.dialog';
import { StatementAgreementDialog } from '../../../e2e/pages/statement-agreement.dialog';
import { Toasts } from '../../../e2e/pages/toasts';

// Video 15: journey 10, list a business. A member fills in /list with a highlight and a service
// added through the full service editor; the verification team's review of a listing with nothing
// to offer; and an owner asked to agree to the updated statement of faith, who agrees, then the
// same owner 30 days on, whose listing the daily job paused. The app is answered by the recorded
// API and the stand-ins of the behaviour specs (ADR 0009); two cards say what the run did behind
// the screen. Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test('journey 10: list a business', async ({ demo }) => {
  const list = new ListBusinessPage(demo.page);
  const editor = new ServiceEditorDialog(demo.page);
  const review = new AdminVerificationPage(demo.page);
  const business = new MyBusinessPage(demo.page);
  const dialog = new StatementAgreementDialog(demo.page);
  const toasts = new Toasts(demo.page);

  await demo.jb.signInAs('member');
  await stubListingDrafts(demo.page);
  await demo.jb.goto('/list');
  await list.name.waitFor();
  await demo.card('Journey 10 · List a business', [
    'A member describes a business and submits it for verification.',
    'This run: from 87% to 100%.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await list.services.check();
  await demo.scene('highlight', async () => {
    await demo.type(list.name, 'Laurent Photography');
    await demo.type(list.tagline, 'Wedding and family portraits across Toronto');
    await demo.type(list.highlight, 'Free first meeting');
    await demo.pause(600);
    await demo.point(list.previewPerks.first());
  });

  await demo.scene('service', async () => {
    await demo.click(list.addItem);
    await editor.title.waitFor();
    await demo.point(editor.note);
    await demo.type(editor.name, 'Engagement session');
    await demo.type(editor.detail, '45 min · In person or video');
    await editor.pricing.selectOption('ask');
    await editor.action.selectOption('book');
    await demo.point(editor.action);
    await editor.duration.fill('45');
    await editor.inPerson.check();
    await demo.type(editor.place, '12 Queen St E, Toronto');
    await demo.click(editor.submit);
    await editor.root.waitFor({ state: 'hidden' });
    await demo.point(list.itemRows.first());
  });

  await stubAdmin(demo.page, {
    listing: { itemCount: 0 },
    otherListings: [
      { name: 'Laurent Photography', stageLabel: 'Pending verification' },
      { name: 'Laurent Studio', stageLabel: 'Draft' },
    ],
  });
  await demo.jb.gotoAdmin(`/verifications/${LISTING_ID}`);
  await review.noItems.waitFor();
  await demo.scene('review', async () => {
    await demo.point(review.noItems);
    await demo.pause(1800);
    await demo.point(review.ownerRow('Other listings'));
  });

  await stubMyBusiness(demo.page, {}, naomiOwing());
  await stubStatementAgreement(demo.page);
  await demo.jb.goto('/my-business');
  await dialog.title.waitFor();
  await demo.scene('statement', async () => {
    await demo.point(dialog.description);
    await demo.pause(2500);
    await demo.point(dialog.read);
    await demo.pause(1200);
    await demo.click(dialog.notNow);
    await business.statementBanner.waitFor();
    await demo.point(business.statementBanner);
  });

  await demo.scene('agree', async () => {
    await demo.click(business.readAndAgree);
    await dialog.title.waitFor();
    await demo.pause(800);
    await demo.click(dialog.agree);
    await toasts.withTitle('Thank you').waitFor();
    await demo.point(toasts.withTitle('Thank you'));
  });

  const lapsed = await stubMyBusiness(demo.page, { paused: true }, naomiOwing(STATEMENT_LAPSED));
  await stubStatementAgreement(demo.page, 'ok', () => {
    lapsed.paused = false;
  });
  await demo.jb.goto('/my-business');
  await dialog.title.waitFor();
  await demo.scene('lapsed', async () => {
    await demo.point(dialog.description);
    await demo.pause(1500);
    await demo.click(dialog.notNow);
    await business.statementBanner.waitFor();
    await demo.point(business.readAndAgree);
    await demo.pause(1500);
    await demo.click(business.readAndAgree);
    await dialog.title.waitFor();
    await demo.click(dialog.agree);
    await business.statementBanner.waitFor({ state: 'detached' });
    await demo.point(business.subtitle);
  });

  await demo.page.mouse.move(1240, 700);
  await demo.card('Behind the screen', [
    'The draft expiry and the statement job run through ScheduledJobs: once a day across instances, with their last success recorded.',
    'GET /api/session carries statementDue; POST /api/statement-of-faith/agreement takes only the current version (409 STATEMENT_VERSION).',
    'While the agreement is overdue, Resume listing is refused with 409 STATEMENT_AGREEMENT_REQUIRED.',
    'A submission unanswered after 10 seconds fails with “We couldn’t save that. Try again.”',
    'Proved by StatementAgreementTests, ListingOnboardingTests, statement-agreement.spec.ts and list-business.spec.ts.',
  ]);
  await demo.scene('behind');

  await demo.card('Journey 10 · 100%', [
    'Done: the highlight, the full editors, the review’s other listings, and agreeing to an updated statement of faith.',
    'Left for the owner, by hand: the new screens against their mocks (ADR 0010).',
  ]);
  await demo.scene('close');
});
