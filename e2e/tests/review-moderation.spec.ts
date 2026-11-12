import { expect, test } from '../fixtures/jb-test';
import { REVIEW_REPORT_ID, stubModeration } from '../fixtures/moderation';
import { AdminReportPage } from '../pages/admin-report.page';
import { AdminReportsPage } from '../pages/admin-reports.page';
import { ReportActionDialog } from '../pages/report-action.dialog';

test.describe('the verification team takes a review down (L2-236)', () => {
  test('AC1: a report of a review is listed with the type "Review"', async ({ page, jb }) => {
    const reports = new AdminReportsPage(page);
    await reports.setWidth(1280);
    await stubModeration(page, { reviewReport: true });
    await jb.gotoAdmin('/reports');

    const row = reports.row('WaterWorks Plumbing & Drains');
    await expect(row).toContainText('Review');
    await expect(row).toContainText('It shares private details');
    await expect(row).toContainText('Samuel Park');
  });

  test('AC2: opening a review report shows the review as it stands, every report of it and its three actions', async ({
    page,
    jb,
  }) => {
    const report = new AdminReportPage(page);
    await report.setWidth(1280);
    const fake = await stubModeration(page, { reviewReport: true });
    await jb.gotoAdmin(`/reports/${REVIEW_REPORT_ID}`);

    await expect(report.heading).toHaveText(
      'Report about a review of WaterWorks Plumbing & Drains',
    );
    await expect(report.subtitle).toContainText('Review ·');
    await expect(report.subtitle).toContainText('In review');
    expect(fake.opened).toEqual([REVIEW_REPORT_ID]);

    await expect(report.review).toContainText('Daniel R.');
    await expect(report.review).toContainText('8 Nov 2026');
    await expect(report.review).toContainText('Blocked drain');
    await expect(report.review.getByRole('img', { name: '1 out of 5 stars' })).toBeVisible();
    await expect(report.review).toContainText('Call me on 416-555-0142');
    await expect(report.review).toContainText('no reply from the owner');

    await expect(report.reviewReports).toContainText('Reports of this review (2)');
    await expect(report.reviewReports).toContainText('It shares private details');
    await expect(report.reviewReports).toContainText('It’s advertising or off-topic');
    await expect(report.reviewReports).toContainText('no note');

    await expect(report.actions).toHaveText([
      'Dismiss',
      'Message the reporter',
      'Take the review down',
    ]);
    await expect(report.report).toHaveCount(0);
  });

  test('AC3: taking the review down needs the reason the author reads and a note, and resolves the report', async ({
    page,
    jb,
  }) => {
    const report = new AdminReportPage(page);
    const dialog = new ReportActionDialog(page);
    await report.setWidth(1280);
    const fake = await stubModeration(page, { reviewReport: true });
    await jb.gotoAdmin(`/reports/${REVIEW_REPORT_ID}`);

    await report.action('Take the review down').click();
    await expect(dialog.title).toHaveText('Take the review down?');
    await expect(dialog.description).toContainText('Daniel R. is told why');
    await expect(dialog.reason).toHaveAttribute('maxlength', '1000');

    await dialog.note.fill('Phone number and a staff member’s name.');
    await dialog.confirm('Take the review down').click();
    await expect(dialog.error).toContainText('Write the reason the author will read.');
    expect(fake.actions).toEqual([]);

    await dialog.reason.fill('It gave a phone number. Reviews share no private details.');
    await expect(dialog.root).toContainText('57 / 1,000');
    await dialog.confirm('Take the review down').click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.actions).toEqual([
      {
        id: REVIEW_REPORT_ID,
        kind: 'take-down',
        resolutionNote: 'Phone number and a staff member’s name.',
        messageText: 'It gave a phone number. Reviews share no private details.',
      },
    ]);
    await expect(report.resolvedNotice).toContainText('This report is resolved');
    await expect(report.history).toContainText('Review taken down');
    await expect(report.review).toContainText('taken down');
  });

  test('AC4: dismissing with a note resolves the report and the review stays', async ({
    page,
    jb,
  }) => {
    const report = new AdminReportPage(page);
    const dialog = new ReportActionDialog(page);
    await report.setWidth(1280);
    const fake = await stubModeration(page, { reviewReport: true });
    await jb.gotoAdmin(`/reports/${REVIEW_REPORT_ID}`);

    await report.action('Dismiss').click();
    await dialog.note.fill('It is about a real job and names no one.');
    await dialog.confirm('Dismiss report').click();

    await expect(dialog.root).toHaveCount(0);
    expect(fake.actions).toEqual([
      {
        id: REVIEW_REPORT_ID,
        kind: 'dismiss',
        resolutionNote: 'It is about a real job and names no one.',
      },
    ]);
    await expect(report.resolvedNotice).toContainText('This report is resolved');
    await expect(report.history).toContainText('Report dismissed');
    await expect(report.review).toContainText('no reply from the owner');
  });
});
