import { expect, test } from '../fixtures/jb-test';
import { stubIncoming } from '../fixtures/incoming-requests';
import { seedRequests, stubMemberRequests } from '../fixtures/member-requests';
import { ConfirmRequestDialog } from '../pages/confirm-request.dialog';
import { IncomingRequestsPage } from '../pages/incoming-requests.page';
import { RequestDetailPage } from '../pages/request-detail.page';

// The owner answers a space request (L2-198) and the member reads it, with the exact address
// only once it is accepted (L2-199). The server composes the words; these specs prove the app
// shows them as a space request.

const SPACE = '7a1e0000-0000-4000-8000-0000000000aa';

test.describe('space requests (L2-198, L2-199)', () => {
  test('L2-198 AC1, AC2: a space request is listed with its dates, and Confirm warns that the address goes', async ({
    page,
    jb,
  }) => {
    const requests = new IncomingRequestsPage(page);
    const dialog = new ConfirmRequestDialog(page);
    await requests.setWidth(1280);
    const fake = await stubIncoming(page);
    fake.arrive({
      kind: 'space',
      kindLabel: 'Space',
      customerName: 'Joanna Adeyemi',
      customerInitials: 'JA',
      title: 'Request to book · Guest suite near Roncesvalles',
      detail: 'Fri 11 Dec – Sun 13 Dec · 2 nights · $240',
      total: '$240',
      when: 'Fri 11 Dec – Sun 13 Dec · 2 nights',
    });
    await jb.goto('/my-business/requests');

    await expect(requests.row('Joanna Adeyemi')).toContainText(
      'Request to book · Guest suite near Roncesvalles',
    );
    await expect(requests.row('Joanna Adeyemi')).toContainText(
      'Fri 11 Dec – Sun 13 Dec · 2 nights · $240',
    );

    await requests.confirmButton('Joanna Adeyemi').click();

    await expect(dialog.title).toHaveText('Confirm Joanna’s request?');
    await expect(dialog.description).toHaveText(
      'Only confirm if the space is free then. Joanna gets your exact address when you confirm.',
    );
    await expect(dialog.details.locator('dt')).toHaveText(['Customer', 'When', 'Total']);
    await expect(dialog.details).toContainText('Fri 11 Dec – Sun 13 Dec · 2 nights');
    await expect(dialog.details).toContainText('$240');
    await expect(dialog.confirm).toHaveText('Confirm request');
  });

  test('L2-198 AC4, L2-199 AC3: an accepted space request reads "Space" and carries the address', async ({
    page,
    jb,
  }) => {
    const detail = new RequestDetailPage(page);
    await detail.setWidth(1280);
    await stubMemberRequests(page, {
      requests: [
        ...seedRequests(),
        {
          id: SPACE,
          kind: 'space',
          kindLabel: 'Space',
          title: 'Request to book · Guest suite near Roncesvalles',
          business: 'Guest suite near Roncesvalles',
          businessSlug: 'roncesvalles-guest-suite',
          detail: 'Fri 11 Dec – Sun 13 Dec · 2 nights · $240',
          sentAt: '2026-11-10T08:00:00-05:00',
          status: 'confirmed',
          previous: 'new',
          details: [
            { label: 'When', value: 'Fri 11 Dec – Sun 13 Dec · 2 nights' },
            { label: 'Total', value: '$240' },
            { label: 'Address', value: '14 Galley Ave, Toronto' },
          ],
          owner: 'Paul',
          categorySlug: 'rooms-rentals',
          categoryWord: 'rentals',
          callout: {
            tone: 'success',
            title: 'Paul accepted',
            text: 'The address is 14 Galley Ave, Toronto.',
            quote: null,
          },
        },
      ],
    });
    await jb.goto(`/requests/${SPACE}`);

    await expect(detail.heading).toHaveText('Request to book · Guest suite near Roncesvalles');
    await expect(detail.callout).toContainText('Paul accepted');
    await expect(detail.subtitle).toContainText('Space');
    await expect(detail.details).toContainText('14 Galley Ave, Toronto');
    await expect(detail.cancel).toHaveText('Cancel request');
  });
});
