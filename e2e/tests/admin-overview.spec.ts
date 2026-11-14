// Acceptance Test
// Traces to: L2-188, L2-274, L2-275
// Description: the overview of the admin application (ADR 0075): the day and the greeting with what
// is waiting on staff, the work queue, and beside it System and Recent changes. The e2e clock reads
// Tuesday 10 November 2026, 09:00 in Toronto.
import { CLEAR_OVERVIEW, stubAdminTables } from '../fixtures/admin-tables';
import { ADMIN_URL, expect, test } from '../fixtures/jb-test';
import { ada, miriam } from '../fixtures/staff';
import { AdminOverviewPage } from '../pages/admin-overview.page';
import { AdminRecordPage } from '../pages/admin-record.page';
import { AdminRecordsPage } from '../pages/admin-records.page';

test.describe('the overview’s work queue (L2-274)', () => {
  test('AC1: it shows the day, the greeting with what is waiting and what happened since yesterday', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');

    await expect(overview.day).toHaveText('Tuesday 10 November');
    await expect(overview.tableLink('Overview')).toHaveAttribute('aria-current', 'page');
    await expect(overview.heading).toHaveText('Good morning, Ada. 10 things are waiting on staff.');
    await expect(overview.since).toHaveText(
      'Since yesterday: 14 new members, 3 listings published, 5 merch orders, 212 requests sent.',
    );
  });

  test('AC2: Safety and Waiting on us list their lines in order', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');

    await expect(overview.queueTitles).toHaveText(['Safety', 'Waiting on us']);
    await expect(overview.queue('Safety')).toContainText('Answer within 24 hours');
    await expect(overview.queue('Waiting on us')).toContainText(
      'Members are waiting for a decision',
    );
    await expect(overview.lines.locator('.work-queue__name')).toHaveText([
      'Security alerts',
      'Listing reports',
      'Conversation reports',
      'Review reports',
      'Data exports not delivered',
      'New feedback',
    ]);
  });

  test('AC2: a line with nothing waiting is left out', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    const fake = await stubAdminTables(page, miriam);
    fake.overview.sections[0]!.lines = fake.overview.sections[0]!.lines.filter(
      (l) => l.table !== 'review-reports',
    );
    await jb.gotoAdmin('/');

    await expect(overview.line('Listing reports')).toBeVisible();
    await expect(overview.line('Review reports')).toHaveCount(0);
  });

  test('AC3: a line shows Next, the age of the oldest and the count as one control', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');

    await expect(overview.next('Listing reports')).toHaveText(
      'Next: Guest suite near Roncesvalles',
    );
    await expect(overview.age('Listing reports')).toHaveText('oldest 3d');
    await expect(overview.age('Security alerts')).toHaveText('oldest 3h');
    await expect(overview.count('Listing reports')).toHaveText('2');
    await expect(overview.all('Listing reports')).toHaveAccessibleName(
      'See all Listing reports, 2 waiting, urgent',
    );
    await expect(overview.all('New feedback')).toHaveAccessibleName(
      'See all New feedback, 2 waiting',
    );
  });

  test('AC3: under 640 px the age is hidden and the count stays', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(360);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');

    await expect(overview.count('Listing reports')).toBeVisible();
    await expect(overview.age('Listing reports')).toBeHidden();
  });

  test('AC4: the name of a line opens the oldest record waiting', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const record = new AdminRecordPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');

    await overview.open('Data exports not delivered').click();

    await expect(page).toHaveURL(`${ADMIN_URL}/data-exports/dex_038`);
    await expect(record.fields.first()).toBeVisible();
  });

  test('AC4: the count of a line opens its table', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const table = new AdminRecordsPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');

    await overview.all('New feedback').click();

    await expect(page).toHaveURL(`${ADMIN_URL}/feedback`);
    await expect(table.heading).toHaveText('Feedback');
  });

  test('AC5: with nothing waiting the overview says so and the queue is all clear', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { overview: structuredClone(CLEAR_OVERVIEW) });
    await jb.gotoAdmin('/');

    await expect(overview.heading).toHaveText('Good morning, Ada. Nothing is waiting on staff.');
    await expect(overview.queueTitles).toHaveText(['All clear']);
    await expect(overview.clear).toHaveText(
      'No reports, alerts, listings or requests are waiting. New ones show here as they arrive; the tables in the sidebar hold everything else.',
    );
    await expect(overview.lines).toHaveCount(0);
  });

  test('AC6: while it loads the heading stays and the lines are skeletons under aria-busy', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { overviewAnswer: 'slow' });
    await jb.gotoAdmin('/');

    await expect(overview.heading).toHaveText('Good morning, Ada.');
    await expect(overview.column).toHaveAttribute('aria-busy', 'true');
    await expect(overview.column).toContainText('Loading what is waiting on staff…');
    await expect(overview.lines.first()).toBeVisible();
    await expect(overview.lines.locator('.work-queue__name')).toHaveCount(0);
  });

  test('AC6: when it fails it says so with JB-ADM-503, and Try again reads it again', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { overviewAnswer: 'fails' });
    await jb.gotoAdmin('/');

    await expect(overview.error.getByRole('heading')).toHaveText(
      'We couldn’t load what is waiting on staff',
    );
    await expect(overview.error).toContainText('JB-ADM-503');

    fake.overviewAnswer = 'ok';
    await overview.retry.click();

    await expect(overview.heading).toHaveText('Good morning, Ada. 10 things are waiting on staff.');
    expect(fake.overviewReads).toBe(2);
  });

  test('AC7: the counts are read when the overview opens, and nothing polls them', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');
    await expect(overview.lines.first()).toBeVisible();
    expect(fake.overviewReads).toBe(1);

    await overview.tableLink('Members').click();
    await expect(page).toHaveURL(`${ADMIN_URL}/members`);
    await overview.tableLink('Overview').click();
    await expect(overview.lines.first()).toBeVisible();
    expect(fake.overviewReads).toBe(2);
  });
});

test.describe('the overview’s system and recent changes (L2-275)', () => {
  test('AC1: a job run that failed says when, and opens Job runs', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');

    const failed = overview.systemItem('Failed');
    await expect(failed).toContainText('exports.build failed at 02:00');
    await expect(failed).toContainText('It did not finish within an hour.');
    await expect(failed).toHaveAttribute('href', '/job-runs');
  });

  test('AC2: outbox messages retrying or given up name their state, and open Outbox messages', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');

    const retrying = overview.systemItem('Retrying');
    await expect(retrying).toContainText('email.account_suspended retrying, attempt 3');
    await expect(retrying).toContainText('Next attempt at 09:52.');
    await expect(retrying).toHaveAttribute('href', '/outbox-messages');
    await expect(overview.systemItem('Gave up')).toContainText('webhook.stripe_refund gave up');
    await expect(overview.systemItem('Gave up')).toContainText(
      'Not sent after 8 attempts in 24 hours.',
    );
    await expect(overview.systemItem('Gave up')).toHaveAttribute('href', '/outbox-messages');
  });

  test('AC3: maintenance under way says until when, and opens Maintenance windows', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');

    const maintenance = overview.systemItem('Maintenance');
    await expect(maintenance).toContainText('Maintenance under way');
    await expect(maintenance).toContainText('Since 02:00, back by 03:30, read-only');
    await expect(maintenance).toHaveAttribute('href', '/maintenance-windows');
  });

  test('AC4: Recent changes list the four newest audit records, and Audit log opens them', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/');

    await expect(overview.changeItems).toHaveCount(4);
    await expect(overview.changeItems.first()).toContainText('Esi updated member mem_c9JmEe');
    await expect(overview.changeItems.first()).toContainText('18 Nov 06:32');
    await expect(overview.auditLog).toHaveAttribute('href', '/audit-records');
  });
});

test.describe('the overview opens the admin application (L2-188)', () => {
  test('AC2: a staff member signed in with no screen asked for lands on the overview', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/sign-in');

    await expect(page).toHaveURL(`${ADMIN_URL}/`);
    await expect(overview.heading).toContainText('Good morning, Miriam.');
  });
});
