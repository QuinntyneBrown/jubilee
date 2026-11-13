import { test } from '../../../e2e/fixtures/demo';
import { confirmedRows, stubIncoming } from '../../../e2e/fixtures/incoming-requests';
import { BIBLE, DRAIN, stubMemberRequests } from '../../../e2e/fixtures/member-requests';
import { CancelRequestDialog } from '../../../e2e/pages/cancel-request.dialog';
import { FulfilRequestDialog } from '../../../e2e/pages/fulfil-request.dialog';
import { IncomingRequestsPage } from '../../../e2e/pages/incoming-requests.page';
import { RequestDetailPage } from '../../../e2e/pages/request-detail.page';
import { RequestsPage } from '../../../e2e/pages/requests.page';
import { Toasts } from '../../../e2e/pages/toasts';

// Video 22: journey 14, track and cancel requests (ADR 0060). Joanna's Your requests changes over the
// event stream when WaterWorks confirms; Naomi marks Grace's confirmed order fulfilled from Incoming
// requests; Joanna's open order completes on screen; a request nobody answered for a week is cancelled
// and the cancel taken back. The app is answered by the stand-ins of the behaviour specs (ADR 0009);
// the later stand-in wins, so each persona is stubbed before its screens. A card says what the run did
// behind the screen. Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test('journey 14: track and cancel requests', async ({ demo }) => {
  const page = demo.page;
  const requests = new RequestsPage(page);
  const detail = new RequestDetailPage(page);
  const incoming = new IncomingRequestsPage(page);
  const fulfil = new FulfilRequestDialog(page);
  const cancel = new CancelRequestDialog(page);
  const toasts = new Toasts(page);
  const park = () => page.mouse.move(1270, 715, { steps: 12 });

  // The member: Joanna, on Your requests.
  const joanna = await stubMemberRequests(page);
  await demo.jb.goto('/requests');
  await requests.row('Kitchen drain').waitFor();
  await demo.card('Journey 14 · Track and cancel requests', [
    'A member follows each request’s progress and cancels an open one.',
    'This run: from 89% to 100%.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('list', async () => {
    await demo.point(requests.subtitle);
    await demo.pause(1500);
    await demo.point(requests.typeTabs);
    await demo.pause(1500);
    await demo.point(requests.row('Kitchen drain'));
  });

  await demo.scene('live', async () => {
    await demo.pause(1500);
    joanna.answer(DRAIN, 'confirmed');
    await requests.row('Kitchen drain').getByText('Confirmed').waitFor();
    await demo.point(requests.row('Kitchen drain'));
    await demo.pause(1500);
    await demo.point(toasts.withTitle('WaterWorks Plumbing & Drains confirmed your quote request'));
  });

  // The owner: Naomi, on the Incoming requests of Luzandre.com.
  const naomi = await stubIncoming(page);
  naomi.rows.push(...confirmedRows());
  await demo.jb.goto('/my-business/requests');
  await incoming.rows.first().waitFor();
  await demo.scene('owner', async () => {
    await demo.click(incoming.statusTab(/^Confirmed/));
    await incoming.fulfilButton('Grace Adeyemi').waitFor();
    await demo.point(incoming.row('Grace Adeyemi'));
    await demo.pause(1000);
    await demo.click(incoming.fulfilButton('Grace Adeyemi'));
    await fulfil.title.waitFor();
    await demo.pause(800);
    await demo.point(fulfil.details);
    await demo.pause(1200);
    await demo.point(fulfil.notYet);
  });

  await demo.scene('fulfilled', async () => {
    await demo.click(fulfil.fulfil);
    await fulfil.title.waitFor({ state: 'detached' });
    await demo.point(toasts.withTitle('Order fulfilled'));
    await demo.pause(1500);
    await demo.point(incoming.statusTab(/^Confirmed/));
  });

  // The member again, on her confirmed order from Christian Bookstores.
  const member = await stubMemberRequests(page);
  await demo.jb.goto(`/requests/${BIBLE}`);
  await detail.callout.waitFor();
  await demo.scene('completed', async () => {
    await demo.point(detail.callout);
    await demo.pause(2000);
    member.answer(BIBLE, 'completed');
    await detail.subtitle.getByText('Completed').waitFor();
    await demo.point(detail.subtitle);
    await demo.pause(1200);
    await demo.point(toasts.withTitle('Your order with Christian Bookstores is complete'));
  });

  const quiet = await stubMemberRequests(page);
  quiet.requests.find((request) => request.id === DRAIN)!.unanswered = true;
  await demo.jb.goto(`/requests/${DRAIN}`);
  await detail.callout.waitFor();
  await demo.scene('unanswered', async () => {
    await demo.point(detail.callout);
    await demo.pause(1500);
    await demo.point(detail.askAgain);
    await demo.pause(800);
    await demo.point(detail.cancel);
  });

  await demo.scene('cancel', async () => {
    await demo.click(detail.cancel);
    await cancel.title.waitFor();
    await demo.pause(1200);
    await demo.point(cancel.keep);
    await demo.pause(1000);
    await demo.click(cancel.cancel);
    const toast = toasts.withTitle('Request cancelled');
    await toast.waitFor();
    await demo.point(detail.callout);
    await demo.pause(1200);
    await demo.click(toasts.action(toast, 'Undo'));
    await toasts.withTitle('Cancellation withdrawn').waitFor();
    await demo.point(detail.callout);
  });

  await park();
  await demo.card('Behind the screen', [
    'A cancel and its withdrawal reach the owner as in-app notifications as well as e-mails (MemberRequestTests, L2-049 AC2, AC3).',
    'Mark fulfilled tells the customer in the app and by e-mail; a cancelled order, a booking or a quote is refused with 409 (IncomingRequestTests, L2-225).',
    'The booking-completion and unanswered-request jobs claim each occurrence once in JobRun and record their success (RequestJobTests, L2-182 AC1, ADR 0060).',
  ]);
  await demo.scene('behind');

  await demo.card('Journey 14 · complete', [
    'Your requests and each request listen to the event stream.',
    'Owners mark confirmed orders fulfilled.',
    'Jubilee takes no payment: members pay the business directly.',
  ]);
  await demo.scene('close');
});
