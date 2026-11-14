// Acceptance Test
// Traces to: L2-099, L2-188, L2-272, L2-276, L2-277, L2-284
// Description: the schema-driven admin application (ADR 0074): its shell with the sidebar of
// tables in their groups, what a role may read, and one table read from the catalog.
import { LISTING_ROWS, MEMBER_ROWS, stubAdminTables } from '../fixtures/admin-tables';
import { ADMIN_URL, expect, test } from '../fixtures/jb-test';
import { ada, miriam } from '../fixtures/staff';
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
      '12 Nov 2026, 10:30',
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
