import { expect, test } from '../fixtures/jb-test';
import { CONVERSATION_REPORT_ID, REPORT_ID, stubModeration } from '../fixtures/moderation';
import { AdminFeaturedPage } from '../pages/admin-featured.page';
import { AdminReportPage } from '../pages/admin-report.page';
import { AdminReportsPage } from '../pages/admin-reports.page';
import { ReportActionDialog } from '../pages/report-action.dialog';
import { Toasts } from '../pages/toasts';

test.describe('handle reports (L2-105)', () => {
  test('AC1: the list shows reports oldest first with the overdue ones marked, and filters by status', async ({
    page,
    jb,
  }) => {
    const reports = new AdminReportsPage(page);
    await reports.setWidth(1280);
    const fake = await stubModeration(page);
    await jb.gotoAdmin('/reports');

    await expect(reports.subtitle).toHaveText('2 unresolved · 1 overdue');
    await expect(reports.rows).toHaveCount(2);
    await expect(reports.row('Misleading')).toContainText('Overdue');
    await expect(reports.row('Pressure to pay')).toContainText('conversation');
    await expect(reports.navLink('Reports')).toHaveAttribute('aria-current', 'page');

    await reports.filter('Resolved').click();
    await expect(reports.filter('Resolved')).toHaveAttribute('aria-selected', 'true');
    expect(fake.statusRequests).toEqual(['unresolved', 'resolved']);
  });

  test('AC1: with nothing to review the list says so', async ({ page, jb }) => {
    const reports = new AdminReportsPage(page);
    await reports.setWidth(1280);
    await stubModeration(page, { reports: 'empty' });
    await jb.gotoAdmin('/reports');

    await expect(reports.empty).toContainText('No reports to review');
    await expect(reports.subtitle).toHaveText('Nothing waiting');
  });

  test('a list that cannot load says so and quotes its reference', async ({ page, jb }) => {
    const reports = new AdminReportsPage(page);
    await reports.setWidth(1280);
    await stubModeration(page, { reports: 'fails' });
    await jb.gotoAdmin('/reports');

    await expect(reports.empty).toContainText('We couldn’t load the reports');
    await expect(reports.reference).toHaveText('JB-ADM-511');
  });

  test('AC2: opening a report moves it to review and shows what was reported', async ({
    page,
    jb,
  }) => {
    const report = new AdminReportPage(page);
    await report.setWidth(1280);
    const fake = await stubModeration(page);
    await jb.gotoAdmin(`/reports/${REPORT_ID}`);

    await expect(report.heading).toHaveText('Report about Luzandre.com');
    await expect(report.subtitle).toContainText('In review');
    await expect(report.report).toContainText('Samuel Park');
    await expect(report.report).toContainText('The owner is never told');
    await expect(report.conversation).toHaveCount(0);
    expect(fake.opened).toEqual([REPORT_ID]);
  });

  test('L2-063 AC3: a reported conversation is shown with the report while it is open', async ({
    page,
    jb,
  }) => {
    const report = new AdminReportPage(page);
    await report.setWidth(1280);
    await stubModeration(page);
    await jb.gotoAdmin(`/reports/${CONVERSATION_REPORT_ID}`);

    await expect(report.conversation).toContainText('Send the money to my cousin first.');
    await expect(report.conversation).toContainText('Your access is recorded');
  });

  test('AC2: an action needs a resolution note and sends it with the action', async ({
    page,
    jb,
  }) => {
    const report = new AdminReportPage(page);
    const dialog = new ReportActionDialog(page);
    await report.setWidth(1280);
    const fake = await stubModeration(page);
    await jb.gotoAdmin(`/reports/${REPORT_ID}`);

    await report.action('Dismiss report').click();
    await dialog.confirm('Dismiss report').click();
    await expect(dialog.error).toContainText('Write a note');
    expect(fake.actions).toEqual([]);

    await dialog.note.fill('Checked the listing; it matches what it says.');
    await dialog.confirm('Dismiss report').click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.actions).toEqual([
      {
        id: REPORT_ID,
        kind: 'dismiss',
        resolutionNote: 'Checked the listing; it matches what it says.',
      },
    ]);
    await expect(report.resolvedNotice).toContainText('This report is resolved');
    await expect(report.history).toContainText('Report dismissed');
    await expect(report.action('Dismiss report')).toHaveCount(0);
  });

  test('AC3: a message to the owner needs the message as well as the note', async ({
    page,
    jb,
  }) => {
    const report = new AdminReportPage(page);
    const dialog = new ReportActionDialog(page);
    await report.setWidth(1280);
    const fake = await stubModeration(page);
    await jb.gotoAdmin(`/reports/${REPORT_ID}`);

    await report.action('Message owner').click();
    await dialog.note.fill('Asked them to fix the claim.');
    await dialog.confirm('Send message').click();
    await expect(dialog.error).toContainText('Write the message');

    await dialog.message.fill('Please correct the description of your hours.');
    await dialog.confirm('Send message').click();
    await expect(dialog.root).toHaveCount(0);
    expect(fake.actions[0]).toMatchObject({
      kind: 'message-owner',
      messageText: 'Please correct the description of your hours.',
    });
    await expect(report.history).toContainText('Message to the owner');
  });

  test('AC4: a hold can be placed and then lifted', async ({ page, jb }) => {
    const report = new AdminReportPage(page);
    const dialog = new ReportActionDialog(page);
    await report.setWidth(1280);
    const fake = await stubModeration(page);
    await jb.gotoAdmin(`/reports/${REPORT_ID}`);

    await report.action('Place on hold').click();
    await dialog.note.fill('Pausing while we ask the owner.');
    await dialog.confirm('Place on hold').click();
    await expect(dialog.root).toHaveCount(0);
    await expect(report.report).toContainText('On hold');
    await expect(report.action('Place on hold')).toHaveCount(0);

    await report.action('Lift hold').click();
    await dialog.note.fill('Owner fixed it.');
    await dialog.confirm('Lift hold').click();
    await expect(dialog.root).toHaveCount(0);
    expect(fake.actions.map((a) => a.kind)).toEqual(['hold', 'lift-hold']);
  });

  test('AC5: removing a listing resolves the report', async ({ page, jb }) => {
    const report = new AdminReportPage(page);
    const dialog = new ReportActionDialog(page);
    await report.setWidth(1280);
    const fake = await stubModeration(page);
    await jb.gotoAdmin(`/reports/${REPORT_ID}`);

    await report.action('Remove listing').click();
    await expect(dialog.title).toHaveText('Remove Luzandre.com?');
    await dialog.note.fill('Repeated misleading claims.');
    await dialog.confirm('Remove listing').click();

    await expect(report.resolvedNotice).toContainText('This report is resolved');
    expect(fake.actions[0].kind).toBe('remove');
  });
});

test.describe('feature businesses (L2-106)', () => {
  test('AC1: a verifier searches live businesses, orders them and saves the week', async ({
    page,
    jb,
  }) => {
    const featured = new AdminFeaturedPage(page);
    const toasts = new Toasts(page);
    await featured.setWidth(1280);
    const fake = await stubModeration(page);
    await jb.gotoAdmin('/featured');

    await featured.search.fill('financial');
    await featured.add('Legacy Financial').click();
    await featured.search.fill('flower');
    await featured.add('Flower Creations').click();
    await expect(featured.chosen).toHaveCount(2);
    await featured.moveDown('Legacy Financial').click();
    await expect(featured.chosen.first()).toContainText('Flower Creations');
    await expect(featured.count).toContainText('2 of 5 chosen');

    await featured.save.click();

    await expect(toasts.withTitle('Featured businesses saved')).toBeVisible();
    expect(fake.saved).toHaveLength(1);
    expect(fake.saved[0].ids).toEqual(['f3', 'f1']);
  });

  test('AC2: no more than five can be chosen', async ({ page, jb }) => {
    const featured = new AdminFeaturedPage(page);
    await featured.setWidth(1280);
    await stubModeration(page);
    await jb.gotoAdmin('/featured');

    for (const name of ['Legacy', 'WaterWorks', 'Flower', 'Luzandre', 'Laurent']) {
      await featured.search.fill(name);
      await featured.found.getByRole('button', { name: /^Add/ }).first().click();
    }
    await expect(featured.chosen).toHaveCount(5);
    await expect(featured.search).toBeDisabled();
    await expect(featured.count).toContainText('Remove one to add another');

    await featured.remove('Laurent Photography').click();
    await expect(featured.search).toBeEnabled();
  });

  test('AC3: a week too close to another is refused and the selection is kept', async ({
    page,
    jb,
  }) => {
    const featured = new AdminFeaturedPage(page);
    await featured.setWidth(1280);
    await stubModeration(page, { save: 'overlaps' });
    await jb.gotoAdmin('/featured');

    await featured.search.fill('Legacy');
    await featured.add('Legacy Financial').click();
    await featured.save.click();

    await expect(featured.alert).toContainText('within 7 days');
    await expect(featured.chosen).toHaveCount(1);
  });

  test('weeks that cannot load say so and quote their reference', async ({ page, jb }) => {
    const featured = new AdminFeaturedPage(page);
    await featured.setWidth(1280);
    await stubModeration(page, { featured: 'fails' });
    await jb.gotoAdmin('/featured');

    await expect(featured.reference).toHaveText('JB-ADM-513');
  });
});
