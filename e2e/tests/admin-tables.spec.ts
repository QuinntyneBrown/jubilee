// Acceptance Test
// Traces to: L2-098, L2-099, L2-106, L2-188, L2-272, L2-276, L2-277, L2-278, L2-279, L2-280, L2-281, L2-282, L2-283,
// L2-284
// Description: the schema-driven admin application (ADR 0075): its shell with the sidebar of
// tables in their groups, what a role may read, and one table read from the catalog.
import {
  FEEDBACK_ROW,
  JOB_RUN_ROW,
  LISTING_ROWS,
  manyMembers,
  MESSAGE_ROW,
  type AdminRow,
  MEMBER_ROWS,
  ORDER_ROWS,
  stubAdminTables,
} from '../fixtures/admin-tables';
import { ADMIN_URL, expect, test } from '../fixtures/jb-test';
import { ada, miriam } from '../fixtures/staff';
import { AdminRecordPage } from '../pages/admin-record.page';
import { AdminRecordsPage } from '../pages/admin-records.page';
import { DeleteRecordsDialog } from '../pages/delete-records.dialog';
import { ExportReasonDialog } from '../pages/export-reason.dialog';
import { Toasts } from '../pages/toasts';

test.describe('the shell of the admin application (L2-272)', () => {
  test('AC1: the top bar shows the lockup, the jump, the address with the environment and the staff member', async ({
    page,
    jb,
  }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(shell.home).toContainText('jubilee');
    await expect(shell.home).toContainText('Admin');
    await expect(shell.jump).toContainText('Jump to a table or record');
    await expect(shell.jump).toContainText('⌘K');
    await expect(shell.address).toContainText('Production');
    await expect(shell.environment).toHaveText('Production');
    await expect(shell.staffButton).toHaveText('AN');
    await expect(shell.staffButton).toHaveAccessibleName('Ada Nwosu, Administrator');
  });

  test('AC1: the lockup opens the overview', async ({ page, jb }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(shell.home).toHaveAttribute('href', '/');
  });

  test('AC2: the sidebar shows Overview, then the groups in order, System marked read-only', async ({
    page,
    jb,
  }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(shell.tableLink('Overview')).toBeVisible();
    await expect(shell.groups()).toHaveText([
      'Accounts',
      'Listings',
      'Requests & messaging',
      'Reviews',
      'Moderation',
      'Member activity',
      'Feedback',
      'Merch',
      'Launch',
      'Site & content',
      'System',
    ]);
    await expect(shell.lockOf(shell.group('System'))).toBeVisible();
    await expect(shell.lockOf(shell.group('Accounts'))).toHaveCount(0);
  });

  test('AC2: each table shows its count, shortened at a thousand and named in full', async ({
    page,
    jb,
  }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    const members = shell.countOf(shell.tableLink('Members'));
    await expect(members).toHaveText('2.4k');
    await expect(members).toHaveAccessibleName('2,431 records');
    await shell.group('Listings').click();
    await expect(shell.countOf(shell.tableLink('Listings'))).toHaveText('184k');
    await expect(shell.countOf(shell.tableLink('Staff'))).toHaveText('6');
  });

  test('AC2: a group button shows and hides its tables', async ({ page, jb }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    const merch = shell.group('Merch');
    await expect(merch).toHaveAttribute('aria-expanded', 'false');
    await expect(shell.tableLink('Merch orders')).toBeHidden();
    await merch.click();
    await expect(merch).toHaveAttribute('aria-expanded', 'true');
    await expect(shell.tableLink('Merch orders')).toBeVisible();
    await merch.press('Enter');
    await expect(shell.tableLink('Merch orders')).toBeHidden();
  });

  test('AC3: the current table is marked and its group is open', async ({ page, jb }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/job-runs');

    await expect(shell.tableLink('Job runs')).toHaveAttribute('aria-current', 'page');
    await expect(shell.tableLink('Overview')).not.toHaveAttribute('aria-current', 'page');
    await expect(shell.group('System')).toHaveAttribute('aria-expanded', 'true');
    await expect(shell.group('Accounts')).toHaveAttribute('aria-expanded', 'false');
  });

  test('AC4: under 1024 px the sidebar is a drawer that holds focus and closes with Escape or the scrim', async ({
    page,
    jb,
  }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(768);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(shell.sidebar).toBeHidden();
    await shell.openTables.click();
    await expect(shell.drawer).toBeVisible();
    await expect(shell.drawerFoot).toHaveText(/Production/);
    await expect(shell.tableLink('Members', true)).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Escape');
    await expect(shell.drawer).toBeHidden();
    await expect(shell.openTables).toBeFocused();

    await shell.openTables.click();
    await shell.closeTables.click();
    await expect(shell.drawer).toBeHidden();
  });

  test('AC4: choosing a table in the drawer opens it and closes the drawer', async ({
    page,
    jb,
  }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(360);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await shell.openTables.click();
    await shell.group('Listings', true).click();
    await shell.tableLink('Listings', true).click();

    await expect(page).toHaveURL(`${ADMIN_URL}/listings`);
    await expect(shell.drawer).toBeHidden();
    await expect(shell.heading).toHaveText('Listings');
  });

  test('AC5: under 768 px a search button stands in for the jump field', async ({ page, jb }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(360);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(shell.jump).toBeHidden();
    await expect(shell.jumpButton).toBeVisible();
    await expect(shell.address).toBeHidden();
  });
});

test.describe('the staff member and signing out (L2-188 AC3)', () => {
  test('the staff menu ends with Sign out, which ends the session', async ({ page, jb }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await shell.staffButton.click();
    await expect(shell.staffMenu).toContainText('Ada Nwosu');
    await expect(shell.staffMenu).toContainText('Administrator');
    await shell.signOut.click();

    await expect(page).toHaveURL(`${ADMIN_URL}/signed-out`);
    expect(fake.staff.signOuts).toBe(1);
  });
});

test.describe('what a role may read (L2-188 AC4, L2-284)', () => {
  test('a moderator does not see Staff in the sidebar', async ({ page, jb }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/members');

    await expect(shell.tableLink('Members')).toBeVisible();
    await expect(shell.tableLink('Staff')).toHaveCount(0);
  });

  test('a table the role may not read says there is nothing here for the role', async ({
    page,
    jb,
  }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/staff');

    await expect(shell.statusHeading).toHaveText('Nothing here for your role');
    await expect(shell.statusText).toHaveText(
      'These screens are for the Jubilee team. Ask a Jubilee administrator for the role you need.',
    );
    await expect(page.locator('body')).toHaveAttribute('data-page', 'admin-only');
  });

  test('AC7: a table that does not exist says the page was not found and offers the overview', async ({
    page,
    jb,
  }) => {
    const shell = new AdminRecordsPage(page);
    await shell.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/no-such-table');

    await expect(shell.statusHeading).toHaveText('We couldn’t find that page.');
    await expect(shell.statusAction('Go to the overview')).toHaveAttribute('href', '/');
  });
});

test.describe('a table of Jubilee’s records (L2-276)', () => {
  test('AC2: the heading shows the group, the name, the sentence, Export and New', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(page.locator('body')).toHaveAttribute('data-page', 'admin-records');
    await expect(records.eyebrow).toHaveText('Accounts');
    await expect(records.heading).toHaveText('Members');
    await expect(records.lead).toHaveText(
      'Everyone with a Jubilee account: shoppers, renters and the people behind each listing.',
    );
    await expect(records.exportButton).toBeVisible();
    await expect(page).toHaveTitle('Members · Jubilee admin');
  });

  test('AC2: a read-only table says so and offers no checkboxes', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    fake.rows['job-runs'] = [
      {
        id: 'search-index@2026-11-14T08:00:00Z',
        name: 'search-index',
        values: { id: 'search-index@2026-11-14T08:00:00Z', name: 'search-index', createdAt: null },
      },
    ];
    await jb.gotoAdmin('/job-runs');

    await expect(records.lockTag).toHaveText('Read-only');
    await expect(records.newRecord).toHaveCount(0);
    await expect(records.checkbox(records.bodyRows.first())).toHaveCount(0);
  });

  test('AC3: the columns are the default fields, with checkboxes and row actions', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(records.columnHeaders.first().getByRole('checkbox')).toHaveAccessibleName(
      'Select all on this page',
    );
    await expect(records.columnHeaders).toHaveText([
      '',
      'ID',
      'Name',
      'Email',
      'Status',
      'Phone',
      'Postal code',
      'Created',
      'Actions',
    ]);
    await expect(records.bodyRows).toHaveCount(2);
    await expect(records.checkbox(records.row('Ruth Chen'))).toHaveAccessibleName(
      'Select Ruth Chen',
    );
  });

  test('AC3: each value is drawn by its type', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/listings');

    const luz = records.row('Luzandre.com');
    await expect((await records.cell(luz, 'ID')).locator('.cell--mono')).toHaveText(
      LISTING_ROWS[0].id,
    );
    await expect((await records.cell(luz, 'Status')).locator('.status')).toHaveText('live');
    await expect((await records.cell(luz, 'Kind')).locator('.status')).toHaveText('shop');
    const owner = (await records.cell(luz, 'Owner')).getByRole('link', { name: 'Ruth Chen' });
    await expect(owner).toHaveAttribute('href', `/members/${MEMBER_ROWS[0].id}`);

    const grace = records.row('Grace Bakery');
    await expect(await records.cell(grace, 'Owner')).toHaveText('deleted');
    await expect(await records.cell(grace, 'Neighbourhood')).toHaveText('—');
    await expect(
      (await records.cell(grace, 'Neighbourhood')).getByRole('img', { name: 'None' }),
    ).toBeVisible();
  });

  test('AC3: money and numbers are right-aligned with tabular figures, and dates are muted', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/merch-orders');

    const order = records.row('Joanna Reyes');
    await expect((await records.cell(order, 'Total')).locator('.cell--num')).toHaveText(
      '$1,248.50',
    );
    await expect(await records.cell(order, 'Total')).toHaveCSS('text-align', 'right');
    await expect((await records.cell(order, 'Lines')).locator('.cell--num')).toHaveText('3');
    await expect((await records.cell(order, 'Created')).locator('.cell--muted')).toHaveText(
      '12 Nov 2026 10:30',
    );
  });

  test('AC4: a row’s name is a link to its record', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(records.row('Ruth Chen').getByRole('link', { name: 'Ruth Chen' })).toHaveAttribute(
      'href',
      `/members/${MEMBER_ROWS[0].id}`,
    );
  });

  test('AC5: under 768 px the table is a list of names, IDs and statuses', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(360);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(records.table).toBeHidden();
    await expect(records.listRows).toHaveCount(2);
    const ruth = records.listRows.first();
    await expect(ruth).toContainText('Ruth Chen');
    await expect(ruth).toContainText(MEMBER_ROWS[0].id);
    await expect(ruth.locator('.status')).toHaveText('active');
    await expect(ruth).toHaveAttribute('href', `/members/${MEMBER_ROWS[0].id}`);
  });

  test('AC7: while loading, six rows of skeletons fill the columns under aria-busy', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada, { answer: 'slow' });
    await jb.gotoAdmin('/members');

    await expect(records.main.locator('[aria-busy="true"]')).toBeVisible();
    await expect(records.bodyRows).toHaveCount(6);
    await expect(records.foot).toHaveCount(0);
  });

  test('AC7: a table that fails says so with its reference, and Try again reads it again', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { answer: 'fails' });
    await jb.gotoAdmin('/members');

    await expect(records.heading).toHaveText('Members');
    await expect(records.search).toBeVisible();
    await expect(records.statusFilter).toBeVisible();
    await expect(records.error).toContainText('We couldn’t load members');
    await expect(records.error).toContainText('JB-ADM-503');
    fake.answer = 'ok';
    await records.retry().click();
    await expect(records.bodyRows).toHaveCount(2);
  });
});

test.describe('search, filter and sort a table (L2-277)', () => {
  test('AC1: the search shows only the rows with a field that contains it, ignoring case', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');
    await expect(records.bodyRows).toHaveCount(2);

    await expect(records.search).toHaveAccessibleName('Search members');
    await expect(records.search).toHaveAttribute('placeholder', 'Search members by any field');
    await records.searchFor('RUTH.C@');

    await expect(records.bodyRows).toHaveCount(1);
    await expect(records.row('Ruth Chen')).toBeVisible();
    expect(decodeURIComponent(fake.rowRequests.at(-1) ?? '')).toContain('q=RUTH.C@');
    expect(fake.rowRequests.at(-1)).toContain('page=1');
  });

  test('AC2: the status chips filter the table, the chosen one pressed', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(records.statusFilter).toHaveAccessibleName('Filter by status');
    await expect(records.statusChips).toHaveText(['All', 'Active', 'Unconfirmed', 'Deleted']);
    await expect(records.chip('All')).toHaveAttribute('aria-pressed', 'true');

    await records.chip('Unconfirmed').click();

    await expect(records.chip('Unconfirmed')).toHaveAttribute('aria-pressed', 'true');
    await expect(records.chip('All')).toHaveAttribute('aria-pressed', 'false');
    await expect(records.bodyRows).toHaveCount(1);
    await expect(records.row('Naomi Laurent')).toBeVisible();
    expect(fake.rowRequests.at(-1)).toContain('status=unconfirmed');
  });

  test('AC3: no match says so, and Clear search and filters brings every row back', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');
    await records.chip('Active').click();
    await records.searchFor('pastor mike');

    await expect(records.empty.first()).toContainText('No members match “pastor mike”');
    await expect(records.empty.first()).toContainText(
      'Search looks at every field, including IDs and emails.',
    );
    await expect(records.bodyRows).toHaveCount(0);
    await expect(records.foot).toHaveCount(0);

    await records.clearSearchAndFilters().click();

    await expect(records.search).toHaveValue('');
    await expect(records.chip('All')).toHaveAttribute('aria-pressed', 'true');
    await expect(records.bodyRows).toHaveCount(2);
  });

  test('AC3: a filter that matches nothing says "match these filters"', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await records.chip('Deleted').click();

    await expect(records.empty.first()).toContainText('No members match these filters');
  });

  test('AC5: a column heading sorts ascending, then descending, then not at all', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');
    await expect(records.header('Name')).toHaveAttribute('aria-sort', 'none');

    await records.sortBy('Name');
    await expect(records.header('Name')).toHaveAttribute('aria-sort', 'ascending');
    await expect(records.bodyRows.first()).toContainText('Naomi Laurent');
    expect(fake.rowRequests.at(-1)).toContain('sort=name&dir=asc');

    await records.sortBy('Name');
    await expect(records.header('Name')).toHaveAttribute('aria-sort', 'descending');
    await expect(records.bodyRows.first()).toContainText('Ruth Chen');
    expect(fake.rowRequests.at(-1)).toContain('sort=name&dir=desc');

    await records.sortBy('Name');
    await expect(records.header('Name')).toHaveAttribute('aria-sort', 'none');
    expect(fake.rowRequests.at(-1)).not.toContain('sort=');
  });
});

test.describe('the Listings table, searched and filtered (L2-099)', () => {
  test('AC2: a status chip shows only the listings with that status', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/listings');

    await records.chip('Taken down').click();

    await expect(records.bodyRows).toHaveCount(1);
    await expect(records.row('Grace Bakery')).toBeVisible();
  });

  test('AC3: a search with no match says "No listings match"', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/listings');

    await records.searchFor('bicycles');

    await expect(records.empty.first()).toContainText('No listings match “bicycles”');
    await expect(records.clearSearchAndFilters()).toBeVisible();
  });

  test('AC4: no listing and no search says when a listing appears', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam, { rows: { listings: [] } });
    await jb.gotoAdmin('/listings');

    await expect(records.empty.first()).toContainText('No listings yet');
    await expect(records.empty.first()).toContainText(
      'A listing appears here as soon as its owner publishes it.',
    );
    await expect(records.clearSearchAndFilters()).toHaveCount(0);
  });
});

test.describe('columns and pages of a table (L2-278)', () => {
  test('AC1: Columns lists every field, the shown ones checked, and Reset to default', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(records.columnsButton).toHaveText(/Columns\s*7/);
    await records.openColumns();
    await expect(records.columnsMenu).toContainText('Show in table');
    await expect(records.columnsMenu.getByRole('menuitemcheckbox')).toHaveText([
      'ID',
      'Name',
      'Email',
      'Status',
      'Phone',
      'Postal code',
      'Created',
      'Email confirmed',
    ]);
    await expect(records.columnChoice('Created')).toHaveAttribute('aria-checked', 'true');
    await expect(records.columnChoice('Email confirmed')).toHaveAttribute('aria-checked', 'false');

    await records.columnChoice('Email confirmed').click();
    await expect(records.columnsButton).toHaveText(/Columns\s*8/);
    await expect(records.columnHeaders.nth(8)).toHaveText('Email confirmed');

    await records.toggleColumn('Phone');
    await expect(records.columnsButton).toHaveText(/Columns\s*7/);
    await expect(records.columnHeaders).not.toContainText(['Phone']);

    await records.openColumns();
    await records.resetColumns.click();
    await expect(records.columnsButton).toHaveText(/Columns\s*7/);
    await expect(records.columnHeaders.nth(5)).toHaveText('Phone');
  });

  test('AC1: the last shown column cannot be hidden', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    for (const label of ['ID', 'Email', 'Status', 'Phone', 'Postal code', 'Created']) {
      await records.toggleColumn(label);
    }
    await expect(records.columnsButton).toHaveText(/Columns\s*1/);
    await records.openColumns();

    await expect(records.columnChoice('Name')).toHaveAttribute('aria-disabled', 'true');
  });

  test('L2-276 AC3: yes and no are a check or a dash named Yes or No', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await records.toggleColumn('Email confirmed');

    const ruth = await records.cell(records.row('Ruth Chen'), 'Email confirmed');
    const naomi = await records.cell(records.row('Naomi Laurent'), 'Email confirmed');
    await expect(ruth.getByRole('img', { name: 'Yes' })).toBeVisible();
    await expect(naomi.getByRole('img', { name: 'No' })).toBeVisible();
  });

  test('AC2: the foot shows the range, the rows per page and the pages around the current one', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { rows: { members: manyMembers(200) } });
    await jb.gotoAdmin('/members');

    await expect(records.range).toHaveText('1–25 of 200');
    await expect(records.rowsButton).toHaveText('25');
    await expect(records.pages.locator('.records__numbers')).toHaveText(
      /^\s*1\s*2\s*3\s*4\s*5\s*…\s*8\s*$/,
    );
    await expect(records.pageButton(1)).toHaveAttribute('aria-current', 'page');
    await expect(records.goTo).toBeVisible();

    await records.nextPage.click();

    await expect(records.range).toHaveText('26–50 of 200');
    await expect(records.pageButton(2)).toHaveAttribute('aria-current', 'page');
    await expect(records.row('Member 026')).toBeVisible();
    expect(fake.rowRequests.at(-1)).toContain('page=2&size=25');
  });

  test('AC2: under 640 px the foot says "Page {n} of {pages}"', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(360);
    await stubAdminTables(page, ada, { rows: { members: manyMembers(200) } });
    await jb.gotoAdmin('/members');

    await expect(records.pageOf).toHaveText('Page 1 of 8');
    await expect(records.rowsButton).toBeHidden();
    await expect(records.goTo).toBeHidden();
  });

  test('AC4: the first page cannot go back and the last cannot go on', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada, { rows: { members: manyMembers(200) } });
    await jb.gotoAdmin('/members');
    await expect(records.previousPage).toHaveAttribute('aria-disabled', 'true');

    await records.goToPage(8);

    await expect(records.range).toHaveText('176–200 of 200');
    await expect(records.nextPage).toHaveAttribute('aria-disabled', 'true');
    await expect(records.previousPage).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('AC3: Rows offers 25, 50, 100 and 250, and a choice returns to page 1', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { rows: { members: manyMembers(200) } });
    await jb.gotoAdmin('/members');
    await records.pageButton(3).click();
    await expect(records.range).toHaveText('51–75 of 200');

    await records.rowsButton.click();
    await expect(records.rowsMenu.getByRole('menuitemradio')).toHaveText([
      '25',
      '50',
      '100',
      '250',
    ]);
    await expect(records.rowsChoice(25)).toHaveAttribute('aria-checked', 'true');
    await records.rowsChoice(50).click();

    await expect(records.range).toHaveText('1–50 of 200');
    await expect(records.rowsButton).toHaveText('50');
    expect(fake.rowRequests.at(-1)).toContain('page=1&size=50');
  });

  test('AC1: a search returns to page 1', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { rows: { members: manyMembers(200) } });
    await jb.gotoAdmin('/members');
    await records.pageButton(2).click();
    await expect(records.range).toHaveText('26–50 of 200');

    await records.searchFor('member1');

    await expect(records.range).toHaveText('1–25 of 100');
    expect(fake.rowRequests.at(-1)).toContain('page=1');
  });

  test('AC5: the columns and the rows per page are kept for the table in the browser', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { rows: { members: manyMembers(200) } });
    await jb.gotoAdmin('/members');
    await records.toggleColumn('Email confirmed');
    await records.showRows(100);
    await expect(records.range).toHaveText('1–100 of 200');

    await page.reload();

    await expect(records.range).toHaveText('1–100 of 200');
    await expect(records.columnsButton).toHaveText(/Columns\s*8/);
    expect(fake.rowRequests.at(-1)).toContain('size=100');
    // Another table keeps its own defaults.
    await jb.gotoAdmin('/listings');
    await expect(records.columnsButton).toHaveText(/Columns\s*7/);
  });
});

test.describe('a record (L2-282)', () => {
  const ruth = MEMBER_ROWS[0];

  test('AC1: a record shows the way back, its name, status and ID', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin(`/members/${ruth.id}`);

    await expect(record.back).toHaveText('Members');
    await expect(record.back).toHaveAttribute('href', '/members');
    await expect(record.here).toHaveText(ruth.id);
    await expect(record.heading).toHaveText('Ruth Chen');
    await expect(record.status).toHaveText('active');
    await expect(record.copyId).toHaveAccessibleName(`Copy ID ${ruth.id}`);
    await expect(page).toHaveTitle('Ruth Chen · Members · Jubilee admin');
    await expect(page.locator('body')).toHaveAttribute('data-page', 'admin-record');
  });

  test('AC1: a record of a read-only table says so', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada, { rows: { 'job-runs': [JOB_RUN_ROW] } });
    await jb.gotoAdmin(`/job-runs/${JOB_RUN_ROW.id}`);

    await expect(record.lockTag).toHaveText('Read-only');
  });

  test('AC3: the fields show each value by its type, and the system values below', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin(`/members/${ruth.id}`);

    await expect(record.field('Email')).toHaveText('ruth.c@outlook.com');
    await expect(record.field('Status').locator('.status')).toHaveText('active');
    await expect(record.field('Phone').getByRole('img', { name: 'None' })).toBeVisible();
    await expect(record.field('Email confirmed').getByRole('img', { name: 'Yes' })).toBeVisible();
    await expect(record.field('ID')).toHaveCount(0);
    await expect(record.system).toContainText(`ID ${ruth.id}`);
    await expect(record.system).toContainText('Created 10 Sept 2026 10:20');
  });

  test('AC3: a reference opens the record it points at', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin(`/merch-orders/${ORDER_ROWS[0].id}`);

    await record.field('Member').getByRole('link', { name: 'Ruth Chen' }).click();

    await expect(page).toHaveURL(new RegExp(`/members/${ruth.id}$`));
    await expect(record.heading).toHaveText('Ruth Chen');
  });

  test('AC4: Points here lists each table that references the record, as which field', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada, {
      records: {
        [`members/${ruth.id}`]: {
          pointsHere: [{ table: 'listings', label: 'Listings', field: 'Owner', count: 1 }],
        },
      },
    });
    await jb.gotoAdmin(`/members/${ruth.id}`);

    await expect(record.pointers).toHaveCount(1);
    await expect(record.pointers.first()).toHaveText(/Listings\s*as owner\s*1/);
    await record.pointers.first().getByRole('link').click();
    await expect(page).toHaveURL(/\/listings$/);
  });

  test('AC4: with nothing pointing here it says so', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin(`/members/${MEMBER_ROWS[1].id}`);

    await expect(record.noPointers).toBeVisible();
  });

  test('AC5: History lists the changes and the creation, newest first', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada, {
      records: {
        [`members/${ruth.id}`]: {
          history: [
            {
              at: '2026-11-12T15:30:00+00:00',
              actor: 'Ada Nwosu',
              what: 'changed phone from — to 416-555-0144',
              text: 'Ada Nwosu changed phone from — to 416-555-0144',
            },
            {
              at: '2026-09-10T14:20:00+00:00',
              actor: 'Jubilee',
              what: 'created this member',
              text: 'Jubilee created this member',
            },
          ],
        },
      },
    });
    await jb.gotoAdmin(`/members/${ruth.id}`);

    await expect(record.history).toHaveCount(2);
    await expect(record.history.nth(0)).toContainText(
      'Ada Nwosu changed phone from — to 416-555-0144',
    );
    await expect(record.history.nth(0)).toContainText('12 Nov 2026 10:30');
    await expect(record.history.nth(1)).toContainText('Jubilee created this member');
  });

  test('AC6: while loading the breadcrumb stays and the rest is skeletons under aria-busy', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada, { recordAnswer: 'slow' });
    await jb.gotoAdmin(`/members/${ruth.id}`);

    await expect(record.back).toHaveText('Members');
    await expect(record.column).toHaveAttribute('aria-busy', 'true');
    await expect(record.heading).toHaveText('Loading member…');
  });

  test('AC6: a record that fails says so with JB-ADM-504, and Try again reads it again', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { recordAnswer: 'fails' });
    await jb.gotoAdmin(`/members/${ruth.id}`);

    await expect(record.error).toContainText(`We couldn’t load member ${ruth.id}`);
    await expect(record.error).toContainText('JB-ADM-504');
    fake.recordAnswer = 'ok';
    await record.retry().click();
    await expect(record.heading).toHaveText('Ruth Chen');
  });

  test('AC6: a record that does not exist is not found', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members/no-such-member');

    await expect(record.heading).toHaveText('We couldn’t find that page.');
    await expect(page.locator('body')).toHaveAttribute('data-page', 'admin-not-found');
  });

  test('L2-276 AC4: choosing a row opens its record', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    const record = new AdminRecordPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await records.row('Naomi Laurent').locator('td').nth(3).click();

    await expect(record.heading).toHaveText('Naomi Laurent');
  });
});

test.describe('edit and create a record (L2-283)', () => {
  const rating = FEEDBACK_ROW;
  const ruth = MEMBER_ROWS[0];

  test('AC1: "Edit" turns each field the role may change into the editor of its type', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin(`/feedback/${rating.id}`);

    await record.edit.click();

    await expect(page).toHaveURL(new RegExp(`/feedback/${rating.id}/edit$`));
    await expect(page.locator('body')).toHaveAttribute('data-page', 'admin-record-edit');
    const status = record.editor('Status');
    await expect(status).toHaveRole('combobox');
    await expect(status.locator('option')).toHaveText(['—', 'new', 'read', 'in progress', 'fixed']);
    await expect(status).toHaveValue('new');
    await expect(record.editor('Reply')).toHaveRole('textbox');
    await expect(record.editor('Note')).toHaveCount(0);
    await expect(record.field('Note')).toHaveText('Finding a plumber was easy.');
    await expect(record.cancel).toBeVisible();
    await expect(record.save).toHaveText('Save changes');
  });

  test('AC1: a table with no field the role may change offers no "Edit"', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin(`/members/${ruth.id}`);

    await expect(record.heading).toHaveText('Ruth Chen');
    await expect(record.edit).toHaveCount(0);
  });

  test('AC2: "Save changes" says "Saving…", then the record reads again with "Saved" and the change heads its history', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    const fake = await stubAdminTables(page, miriam, { saveAnswer: 'slow' });
    await jb.gotoAdmin(`/feedback/${rating.id}/edit`);
    await record.editor('Status').selectOption('read');
    await record.editor('Reply').fill('Thank you, Ruth.');

    await record.save.click();

    await expect(record.save).toHaveText('Saving…');
    await expect(record.save).toHaveAttribute('aria-disabled', 'true');
    await record.save.click({ force: true });
    expect(fake.saves).toEqual([
      {
        method: 'PATCH',
        path: `/feedback/${rating.id}`,
        values: { status: 'read', reply: 'Thank you, Ruth.' },
      },
    ]);

    fake.saveAnswer = 'ok';
    await jb.gotoAdmin(`/feedback/${rating.id}/edit`);
    await record.editor('Status').selectOption('read');
    await record.save.click();

    await expect(page).toHaveURL(new RegExp(`/feedback/${rating.id}$`));
    await expect(record.saved).toHaveText('Saved');
    await expect(record.status).toHaveText('read');
    await expect(record.history.first()).toContainText(
      'Miriam Castillo changed status from new to read',
    );
  });

  test('AC2: a refusal says what is wrong under each field, and nothing is saved', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, miriam, {
      saveAnswer: 'refused',
      refusal: { status: 'NOT_ALLOWED', reply: 'TOO_LONG' },
    });
    await jb.gotoAdmin(`/feedback/${rating.id}/edit`);
    await record.editor('Status').selectOption('fixed');
    await record.editor('Reply').fill('A very long reply');

    await record.save.click();

    await expect(record.fieldError('Status')).toHaveText('Status can’t change to that.');
    await expect(record.fieldError('Reply')).toHaveText('Reply is too long.');
    await expect(record.editor('Reply')).toHaveAttribute('aria-invalid', 'true');
    await expect(record.editor('Reply')).toHaveAccessibleDescription('Reply is too long.');
    await expect(record.editor('Reply')).toHaveValue('A very long reply');
    await expect(page).toHaveURL(new RegExp(`/feedback/${rating.id}/edit$`));
    await expect(record.save).toHaveText('Save changes');
  });

  test('AC3: "Cancel" drops the changes and the record reads again', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    const fake = await stubAdminTables(page, miriam);
    await jb.gotoAdmin(`/feedback/${rating.id}/edit`);
    await record.editor('Reply').fill('Not sent');

    await record.cancel.click();

    await expect(page).toHaveURL(new RegExp(`/feedback/${rating.id}$`));
    await expect(record.field('Reply').getByRole('img', { name: 'None' })).toBeVisible();
    expect(fake.saves).toEqual([]);
  });

  test('AC4: "New featured slot" opens empty editors and creates the record', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    const record = new AdminRecordPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/featured-slots');

    await expect(records.newRecord).toHaveText('New featured slot');
    await records.newRecord.click();

    await expect(page).toHaveURL(/\/featured-slots\/new$/);
    await expect(record.heading).toHaveText('New featured slot');
    await expect(record.here).toHaveText('New');
    await expect(record.system).toContainText('ID set on create');
    await expect(record.aside).toHaveCount(0);
    const listing = record.editor('Listing');
    await expect(listing.locator('option').first()).toHaveText('None');
    await expect(listing.locator('option', { hasText: 'Luzandre.com' })).toHaveText(
      `Luzandre.com · ${LISTING_ROWS[0].id}`,
    );
    await expect(record.editor('Position')).toHaveValue('');
    await expect(record.cancel).toHaveAttribute('href', '/featured-slots');

    await listing.selectOption({ label: `Luzandre.com · ${LISTING_ROWS[0].id}` });
    await record.editor('Position').fill('1');
    await record.editor('Week of').fill('2026-11-16');
    await record.create('featured slot').click();

    expect(fake.saves).toEqual([
      {
        method: 'POST',
        path: '/featured-slots',
        values: { listingId: LISTING_ROWS[0].id, position: '1', startsOn: '2026-11-16' },
      },
    ]);
    await expect(page).toHaveURL(/\/featured-slots\/new-1$/);
    await expect(record.field('Listing')).toHaveText('Luzandre.com');
  });

  // L2-106 AC1: the featured week's rules hold on the table's creation, where the old Featured
  // screen's chooser held them (ADR 0075).
  test('L2-106 AC1: a sixth slot in one week, or one too close to another week, is refused under "Week of"', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    const fake = await stubAdminTables(page, miriam, {
      saveAnswer: 'refused',
      refusal: { startsOn: 'WEEK_FULL' },
    });
    await jb.gotoAdmin('/featured-slots/new');

    await record.editor('Listing').selectOption({ label: `Luzandre.com · ${LISTING_ROWS[0].id}` });
    await record.editor('Position').fill('2');
    await record.editor('Week of').fill('2026-11-16');
    await record.create('featured slot').click();

    await expect(record.fieldError('Week of')).toHaveText(
      'That week already has five featured listings.',
    );
    fake.refusal = { startsOn: 'WEEK_OVERLAPS' };
    await record.create('featured slot').click();
    await expect(record.fieldError('Week of')).toHaveText(
      'Another featured week overlaps this one.',
    );
    await expect(page).toHaveURL(/\/featured-slots\/new$/);
  });

  test('ADR 0075: the old Featured screen’s path opens Featured slots', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/featured');

    await expect(page).toHaveURL(`${ADMIN_URL}/featured-slots`);
    await expect(records.heading).toHaveText('Featured slots');
  });

  test('AC4: a table the role cannot create in offers no "New"', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(records.heading).toHaveText('Members');
    await expect(records.newRecord).toHaveCount(0);
  });
});

test.describe('row actions and selection (L2-280)', () => {
  const rating = FEEDBACK_ROW;
  const slot = {
    id: '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    name: '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    values: {
      id: '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
      listingId: {
        table: 'listings',
        id: LISTING_ROWS[0].id,
        name: 'Luzandre.com',
        deleted: false,
      },
      position: 2,
      startsOn: '2026-11-16',
    },
  };

  test('AC1: the actions of a row are Open, Edit and Copy ID with the start of the ID', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/feedback');

    const menu = await records.openRowMenu('Ruth Chen');

    await expect(menu.getByRole('menuitem')).toHaveText(['Open', 'Edit', /^\s*Copy ID/]);
    await expect(menu.getByRole('menuitem', { name: /^Copy ID/ })).toContainText(
      rating.id.slice(0, 12),
    );
    await menu.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page).toHaveURL(new RegExp(`/feedback/${rating.id}/edit$`));
  });

  test('AC1: a read-only table offers Open and Copy ID only', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada, { rows: { 'job-runs': [JOB_RUN_ROW] } });
    await jb.gotoAdmin('/job-runs');

    const menu = await records.openRowMenu(JOB_RUN_ROW.name);

    await expect(menu.getByRole('menuitem')).toHaveText(['Open', /^\s*Copy ID/]);
    await menu.getByRole('menuitem', { name: 'Open' }).click();
    await expect(page).toHaveURL(new RegExp(`/job-runs/${JOB_RUN_ROW.id}$`));
  });

  test('AC2: "Copy ID" says "ID copied"', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/feedback');

    const menu = await records.openRowMenu('Ruth Chen');
    await menu.getByRole('menuitem', { name: /^Copy ID/ }).click();

    await expect(new Toasts(page).withTitle('ID copied')).toBeVisible();
  });

  test('AC2: "Duplicate" opens a new record with the row’s values but its ID', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    const record = new AdminRecordPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam, {
      rows: { 'featured-slots': [slot], listings: LISTING_ROWS },
    });
    await jb.gotoAdmin('/featured-slots');

    const menu = await records.openRowMenu(slot.name);
    await menu.getByRole('menuitem', { name: 'Duplicate' }).click();

    await expect(page).toHaveURL(/\/featured-slots\/new$/);
    await expect(record.heading).toHaveText('New featured slot');
    await expect(record.editor('Listing')).toHaveValue(LISTING_ROWS[0].id);
    await expect(record.editor('Position')).toHaveValue('2');
    await expect(record.editor('Week of')).toHaveValue('2026-11-16');
    await expect(record.system).toContainText('ID set on create');
  });

  test('AC3: checked rows are selected, and a bar counts them until the selection is cleared', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');
    await expect(records.bulkBar).toHaveCount(0);

    await records.select('Ruth Chen');

    await expect(records.row('Ruth Chen')).toHaveAttribute('aria-selected', 'true');
    await expect(records.row('Naomi Laurent')).not.toHaveAttribute('aria-selected', 'true');
    await expect(records.bulkBar).toHaveAccessibleName('Selected members');
    await expect(records.bulkCount).toHaveText('1 selected');
    await expect(records.setStatus).toHaveCount(0);

    await records.selectAll.check();
    await expect(records.bulkCount).toHaveText('2 selected');
    await expect(records.row('Naomi Laurent')).toHaveAttribute('aria-selected', 'true');

    await records.clearSelection.click();
    await expect(records.bulkBar).toHaveCount(0);
    await expect(records.selectAll).not.toBeChecked();
    await expect(records.checkbox(records.row('Ruth Chen'))).not.toBeChecked();
  });

  test('AC4: "Set status" sets the chosen status on every selected row and says so', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/feedback');
    await records.select('Ruth Chen');

    await records.setStatus.click();

    await expect(records.setStatus).toHaveText('Set status');
    await expect(records.statusMenu.getByRole('menuitem')).toHaveText([
      'new',
      'read',
      'in progress',
      'fixed',
    ]);
    await records.statusMenu.getByRole('menuitem', { name: 'read', exact: true }).click();

    expect(fake.saves).toEqual([
      { method: 'POST', path: '/feedback/status', values: { ids: [rating.id], status: 'read' } },
    ]);
    await expect(new Toasts(page).withTitle('1 set to read')).toBeVisible();
    await expect(records.bulkBar).toHaveCount(0);
    await expect(await records.cell(records.row('Ruth Chen'), 'Status')).toHaveText('read');
  });
});

test.describe('delete records (L2-281)', () => {
  const [ruth, naomi] = MEMBER_ROWS;

  test('AC1: "Delete" on a row asks first, naming the record and what points at it; "Keep it" keeps it', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    const dialog = new DeleteRecordsDialog(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada, {
      records: {
        [`members/${ruth.id}`]: {
          pointsHere: [
            { table: 'sessions', label: 'Sessions', field: 'memberId', count: 2 },
            { table: 'listings', label: 'Listings', field: 'ownerId', count: 1 },
          ],
        },
      },
    });
    await jb.gotoAdmin('/members');

    const menu = await records.openRowMenu('Ruth Chen');
    await menu.getByRole('menuitem', { name: 'Delete' }).click();

    await expect(dialog.title).toHaveText('Delete Ruth Chen?');
    await expect(dialog.description).toHaveText(
      'This removes it for everyone on Jubilee. The deletion is kept in Audit records, but the data can’t be brought back after 30 days.',
    );
    await expect(dialog.doomed).toHaveText([`Ruth Chen${ruth.id}`]);
    await expect(dialog.pointing).toHaveText(
      '3 other records point here, in Sessions, Listings. They’ll show “deleted” where this used to be.',
    );
    await expect(dialog.confirmation).toHaveCount(0);
    await expect(dialog.delete).toHaveText('Delete member');

    await dialog.keep.click();
    await expect(dialog.root).toHaveCount(0);
    await expect(records.row('Ruth Chen')).toBeVisible();
    expect(fake.saves).toEqual([]);
  });

  test('AC3: a deleted record leaves the table, and "Undo" brings it back as it was', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    const dialog = new DeleteRecordsDialog(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    const menu = await records.openRowMenu('Ruth Chen');
    await menu.getByRole('menuitem', { name: 'Delete' }).click();
    await dialog.delete.click();

    const toast = new Toasts(page).withTitle('1 member deleted');
    await expect(toast).toBeVisible();
    await expect(records.row('Ruth Chen')).toHaveCount(0);
    expect(fake.saves).toEqual([
      { method: 'POST', path: '/members/delete', values: { ids: [ruth.id] } },
    ]);

    await toast.getByRole('button', { name: 'Undo' }).click();

    await expect(records.row('Ruth Chen')).toBeVisible();
    expect(fake.saves.at(-1)).toEqual({
      method: 'POST',
      path: '/members/restore',
      values: { ids: [ruth.id] },
    });
  });

  test('AC2: deleting the selection waits for "delete" to be typed', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    const dialog = new DeleteRecordsDialog(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');
    await records.select('Ruth Chen', 'Naomi Laurent');

    await records.deleteSelected.click();

    await expect(dialog.title).toHaveText('Delete 2 members?');
    await expect(dialog.doomed).toHaveText([`Ruth Chen${ruth.id}`, `Naomi Laurent${naomi.id}`]);
    await expect(dialog.keep).toHaveText('Keep them');
    await expect(dialog.delete).toHaveText('Delete 2 members');
    await expect(dialog.delete).toHaveAttribute('aria-disabled', 'true');
    await dialog.confirmation.press('Enter');
    await expect(dialog.title).toBeVisible();
    expect(fake.saves).toEqual([]);

    await dialog.confirmation.fill('delete');
    await expect(dialog.delete).not.toHaveAttribute('aria-disabled', 'true');
    await dialog.delete.click();

    await expect(new Toasts(page).withTitle('2 members deleted')).toBeVisible();
    await expect(records.bulkBar).toHaveCount(0);
    await expect(records.row('Naomi Laurent')).toHaveCount(0);
    expect(fake.saves).toEqual([
      { method: 'POST', path: '/members/delete', values: { ids: [ruth.id, naomi.id] } },
    ]);
  });

  test('AC3: deleting from the record opens the table with the toast', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    const records = new AdminRecordsPage(page);
    const dialog = new DeleteRecordsDialog(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada, {
      records: {
        [`members/${ruth.id}`]: {
          pointsHere: [{ table: 'sessions', label: 'Sessions', field: 'memberId', count: 1 }],
        },
      },
    });
    await jb.gotoAdmin(`/members/${ruth.id}`);

    await record.delete.click();

    await expect(dialog.title).toHaveText('Delete Ruth Chen?');
    await expect(dialog.pointing).toHaveText(
      '1 other record points here, in Sessions. They’ll show “deleted” where this used to be.',
    );
    await dialog.delete.click();

    await expect(page).toHaveURL(/\/members$/);
    await expect(new Toasts(page).withTitle('1 member deleted')).toBeVisible();
    await expect(records.row('Naomi Laurent')).toBeVisible();
    await expect(records.row('Ruth Chen')).toHaveCount(0);
  });

  test('AC5: a table the role may not delete in offers no "Delete"', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    const record = new AdminRecordPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/feedback');

    const menu = await records.openRowMenu('Ruth Chen');
    await expect(menu.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await records.select('Ruth Chen');
    await expect(records.bulkBar).toBeVisible();
    await expect(records.deleteSelected).toHaveCount(0);

    await jb.gotoAdmin(`/feedback/${FEEDBACK_ROW.id}`);
    await expect(record.heading).toBeVisible();
    await expect(record.delete).toHaveCount(0);
  });
});

test.describe('export a table (L2-279)', () => {
  const [ruth, naomi] = MEMBER_ROWS;

  test('AC1: Export offers CSV and JSON of every record with the count, and the weekly e-mail', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await records.exportButton.click();

    await expect(records.exportMenu.locator('.menu__label')).toHaveText('Download');
    await expect(records.exportMenu.getByRole('menuitem')).toHaveText([
      /CSV, every member\s*2,431/,
      /JSON, every field\s*2,431/,
      'Email me this weekly',
    ]);
  });

  test('AC1: where Export starts its row, the menu opens from its start and leaves the sidebar clear', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    // At 1100 px the sidebar shows, and the Members table's description of the design data pushes
    // the heading's actions under the title.
    await records.setWidth(1100);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/members');
    const button = await records.exportButton.boundingBox();
    const heading = await records.heading.boundingBox();
    expect(Math.round(button!.x)).toBe(Math.round(heading!.x));

    const menu = await records.openExportMenu();

    const sidebar = await records.sidebar.boundingBox();
    expect(menu.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width);
    expect(Math.round(menu.x)).toBe(Math.round(button!.x));
  });

  test('AC1: beside the title, the menu opens with its end on the end of Export', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1440);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    const menu = await records.openExportMenu();

    const button = await records.exportButton.boundingBox();
    expect(Math.round(menu.x + menu.width)).toBe(Math.round(button!.x + button!.width));
  });

  test('AC1: with a search, Export offers the matching rows first', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');
    await records.search.fill('ruth');
    await expect(records.row('Naomi Laurent')).toHaveCount(0);

    await records.exportButton.click();
    await expect(records.exportMenu.getByRole('menuitem').first()).toHaveText(
      /CSV, matching rows\s*1/,
    );
    const download = page.waitForEvent('download');
    await records.exportMenu.getByRole('menuitem', { name: /^CSV, matching rows/ }).click();

    expect((await download).suggestedFilename()).toBe('members-2026-11-14.csv');
    expect(fake.exports).toEqual(['/members/export?format=csv&q=ruth']);
  });

  test('AC2: CSV and JSON download the files the server builds', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    let download = page.waitForEvent('download');
    await records.exportAs(/^CSV, every member/);
    expect((await download).suggestedFilename()).toBe('members-2026-11-14.csv');

    download = page.waitForEvent('download');
    await records.exportAs(/^JSON, every field/);
    expect((await download).suggestedFilename()).toBe('members-2026-11-14.json');
    expect(fake.exports).toEqual(['/members/export?format=csv', '/members/export?format=json']);
  });

  test('AC2: Export in the selection bar downloads the selected rows', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');
    await records.select('Ruth Chen', 'Naomi Laurent');

    const download = page.waitForEvent('download');
    await records.exportSelected.click();

    expect((await download).suggestedFilename()).toBe('members-2026-11-14.csv');
    expect(fake.exports).toEqual([`/members/export?format=csv&ids=${ruth.id}&ids=${naomi.id}`]);
  });

  test('AC3: "Email me this weekly" turns on, and the same menu stops it', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await records.exportAs('Email me this weekly');

    await expect(
      new Toasts(page).withTitle('Every Monday at 08:00 you’ll get a link to this table’s CSV'),
    ).toBeVisible();
    await records.exportButton.click();
    await expect(records.exportMenu.getByRole('menuitem').last()).toHaveText(
      'Stop the weekly email',
    );
    await records.exportMenu.getByRole('menuitem', { name: 'Stop the weekly email' }).click();

    await expect(new Toasts(page).withTitle('The weekly email is stopped')).toBeVisible();
    expect(fake.saves).toEqual([
      { method: 'PUT', path: '/members/weekly-export', values: {} },
      { method: 'DELETE', path: '/members/weekly-export', values: {} },
    ]);
  });

  test('AC3: the link of the weekly e-mail downloads the CSV', async ({ page, jb }) => {
    await new AdminRecordsPage(page).setWidth(1280);
    const fake = await stubAdminTables(page, ada);

    const download = page.waitForEvent('download');
    await jb.gotoAdmin('/members?export=csv');

    expect((await download).suggestedFilename()).toBe('members-2026-11-14.csv');
    expect(fake.exports).toEqual(['/members/export?format=csv']);
    await expect(page).toHaveURL(/\/members$/);
  });

  test('AC4: a private table asks why before it exports, and sends the reason', async ({
    page,
    jb,
  }) => {
    const records = new AdminRecordsPage(page);
    const dialog = new ExportReasonDialog(page);
    await records.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { rows: { messages: [] } });
    await jb.gotoAdmin('/messages');

    await records.exportAs(/^CSV, every message/);

    await expect(dialog.title).toHaveText('Why export messages?');
    await expect(dialog.description).toHaveText(
      'Messages are private. Your reason is kept in Audit records with the export, under your name.',
    );
    await expect(dialog.export).toHaveAttribute('aria-disabled', 'true');
    expect(fake.exports).toEqual([]);

    await dialog.reason.fill('Report JB-4411 asks for the thread');
    const download = page.waitForEvent('download');
    await dialog.export.click();

    expect((await download).suggestedFilename()).toBe('messages-2026-11-14.csv');
    expect(fake.exports).toEqual([
      '/messages/export?format=csv&reason=Report+JB-4411+asks+for+the+thread',
    ]);
    await expect(dialog.title).toHaveCount(0);
  });
});

test.describe('private records and one’s own listing (L2-284)', () => {
  test('AC2: a record of System says Jubilee writes it itself', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, ada, { rows: { 'job-runs': [JOB_RUN_ROW] } });
    await jb.gotoAdmin(`/job-runs/${JOB_RUN_ROW.id}`);

    await expect(record.note).toHaveText(
      'Jubilee writes these records itself. They can be read and exported, never changed.',
    );
  });

  test('AC3: a message of a reported conversation says its read was written to Audit records', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, miriam, {
      rows: { messages: [MESSAGE_ROW] },
      records: { [`messages/${MESSAGE_ROW.id}`]: { readAudited: true } },
    });
    await jb.gotoAdmin(`/messages/${MESSAGE_ROW.id}`);

    await expect(record.heading).toHaveText('Naomi Laurent');
    await expect(record.note).toHaveText(
      'Messages are private. Opening this one was written to Audit records under your name.',
    );
  });

  test('AC3: a message without an open report does not open, and says why', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, miriam, {
      rows: { messages: [MESSAGE_ROW] },
      records: { [`messages/${MESSAGE_ROW.id}`]: { closed: true } },
    });
    await jb.gotoAdmin(`/messages/${MESSAGE_ROW.id}`);

    await expect(record.closed.getByRole('heading')).toHaveText('This message is private');
    await expect(record.closed).toContainText(
      'It opens only while its conversation has an open report. Nothing was written to Audit records.',
    );
    await expect(record.closedBack).toHaveText('Back to messages');
    await expect(record.closedBack).toHaveAttribute('href', '/messages');
    await expect(record.fields).toHaveCount(0);
  });

  // A listing's own record opens the moderation screen until the old screens retire, so its
  // report shows the record of the admin tables (L2-284 AC4: "its record or a report of it").
  const report: AdminRow = {
    id: '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a',
    name: '5d4c3b2a',
    values: { id: '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a', name: '5d4c3b2a' },
  };

  test('AC4: a report of one’s own listing offers no action and says another member of the team acts on it', async ({
    page,
    jb,
  }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, miriam, {
      rows: { 'listing-reports': [report] },
      records: { [`listing-reports/${report.id}`]: { ownListing: true } },
    });
    await jb.gotoAdmin(`/listing-reports/${report.id}`);

    await expect(record.heading).toHaveText('5d4c3b2a');
    await expect(record.note).toHaveText(
      'This is your own listing. Another member of the Jubilee team has to act on it and its reports.',
    );
    await expect(record.edit).toHaveCount(0);
    await expect(record.delete).toHaveCount(0);
  });

  test('AC3, AC4: another record says nothing more', async ({ page, jb }) => {
    const record = new AdminRecordPage(page);
    await record.setWidth(1280);
    await stubAdminTables(page, miriam, { rows: { 'listing-reports': [report] } });
    await jb.gotoAdmin(`/listing-reports/${report.id}`);

    await expect(record.heading).toHaveText('5d4c3b2a');
    await expect(record.note).toHaveCount(0);
  });
});
