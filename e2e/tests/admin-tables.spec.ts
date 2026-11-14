// Acceptance Test
// Traces to: L2-099, L2-106, L2-188, L2-272, L2-276, L2-277, L2-278, L2-282, L2-283, L2-284
// Description: the schema-driven admin application (ADR 0074): its shell with the sidebar of
// tables in their groups, what a role may read, and one table read from the catalog.
import {
  FEEDBACK_ROW,
  JOB_RUN_ROW,
  LISTING_ROWS,
  manyMembers,
  MEMBER_ROWS,
  ORDER_ROWS,
  stubAdminTables,
} from '../fixtures/admin-tables';
import { ADMIN_URL, expect, test } from '../fixtures/jb-test';
import { ada, miriam } from '../fixtures/staff';
import { AdminRecordPage } from '../pages/admin-record.page';
import { AdminRecordsPage } from '../pages/admin-records.page';

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

  test('AC4: a table the role cannot create in offers no "New"', async ({ page, jb }) => {
    const records = new AdminRecordsPage(page);
    await records.setWidth(1280);
    await stubAdminTables(page, ada);
    await jb.gotoAdmin('/members');

    await expect(records.heading).toHaveText('Members');
    await expect(records.newRecord).toHaveCount(0);
  });
});
