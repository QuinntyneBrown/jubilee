// Acceptance Test
// Traces to: L2-273
// Description: the jump palette of the admin application (ADR 0074): ⌘K, Ctrl K, the jump field or the
// search button open "Jump to"; it lists tables, then the records the staff member may read whose ID
// or name contains the text; the arrow keys choose, Enter opens, Escape closes.
import { stubAdminTables } from '../fixtures/admin-tables';
import { ADMIN_URL, expect, test } from '../fixtures/jb-test';
import { ada, miriam } from '../fixtures/staff';
import { AdminOverviewPage } from '../pages/admin-overview.page';
import { AdminRecordPage } from '../pages/admin-record.page';
import { AdminRecordsPage } from '../pages/admin-records.page';
import { JumpPaletteDialog } from '../pages/jump-palette.dialog';

test.describe('jump to a table or record (L2-273)', () => {
  test('AC1: Ctrl K opens "Jump to" near the top with the field focused and "esc"', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();

    await palette.openWithKeys('Control');

    await expect(palette.field).toBeFocused();
    await expect(palette.field).toHaveAttribute(
      'placeholder',
      'Members, ruth.c@outlook.com, lst_flower…',
    );
    await expect(palette.dialog).toContainText('esc');
  });

  test('AC1: ⌘K opens it too', async ({ page, jb }) => {
    const table = new AdminRecordsPage(page);
    const palette = new JumpPaletteDialog(page);
    await table.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/members');
    await expect(table.heading).toHaveText('Members');

    await palette.openWithKeys('Meta');

    await expect(palette.field).toBeFocused();
  });

  test('AC1: "Jump to a table or record" opens it', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');

    await overview.jump.click();

    await expect(palette.dialog).toBeVisible();
    await expect(palette.field).toBeFocused();
  });

  test('AC1: under 768 px "Search" opens it', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(360);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');

    await overview.jumpButton.click();

    await expect(palette.dialog).toBeVisible();
  });

  test('AC2: with nothing typed it lists the first ten tables with their groups', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();

    await palette.openWithKeys();

    await expect(palette.options).toHaveCount(10);
    await expect(palette.labels().first()).toHaveText('Members');
    await expect(palette.metas().first()).toHaveText('Accounts');
    await expect(palette.chosen).toHaveText(/Members/);
  });

  test('AC3: typed text lists the tables whose name or group contains it, then records', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();
    await palette.openWithKeys();

    await palette.search('MODERATION');

    await expect(palette.metas().first()).toHaveText('Moderation');
    await expect(palette.labels().first()).toHaveText('Listing reports');
  });

  test('AC3: records across the tables match by ID or name, ignoring case', async ({
    page,
    jb,
  }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    const fake = await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();
    await palette.openWithKeys();

    await palette.search('Ruth');

    await expect(palette.labels()).toHaveText([
      'Ruth Castillo',
      'ruth.c@outlook.com',
      'ruth.c@outlook.com',
      'ruth.c@outlook.com',
      'ruth.c@outlook.com',
    ]);
    await expect(palette.metas()).toHaveText([
      'Member · mem_c9JmEe',
      'Sign-in failure · sif_901',
      'Sign-in failure · sif_900',
      'Sign-in failure · sif_899',
      'Password reset request · pwr_311',
    ]);
    await expect(palette.options.first().locator('.palette__kind')).toHaveText('R');
    expect(fake.jumps).toContain('Ruth');
  });

  test('AC4: the arrow keys move the choice and Enter opens it', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    const record = new AdminRecordPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();
    await palette.openWithKeys();
    await palette.search('ruth');
    await expect(palette.chosen).toContainText('Ruth Castillo');

    await page.keyboard.press('ArrowDown');
    await expect(palette.chosen).toContainText('sif_901');
    await expect(palette.field).toHaveAttribute(
      'aria-activedescendant',
      (await palette.chosen.getAttribute('id')) ?? '',
    );
    await page.keyboard.press('ArrowUp');
    await expect(palette.chosen).toContainText('Ruth Castillo');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(`${ADMIN_URL}/members/mem_c9JmEe`);
    await expect(palette.dialog).toBeHidden();
    await expect(record.heading).toHaveText('Ruth Castillo');
  });

  test('AC4: Enter on a table opens it', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    const table = new AdminRecordsPage(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();
    await palette.openWithKeys();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(`${ADMIN_URL}/staff`);
    await expect(table.heading).toContainText('Staff');
  });

  test('AC4: Escape closes the dialog', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();
    await palette.openWithKeys();

    await page.keyboard.press('Escape');

    await expect(palette.dialog).toBeHidden();
    await expect(page).toHaveURL(`${ADMIN_URL}/`);
  });

  test('AC4: a press outside closes the dialog', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();
    await palette.openWithKeys();

    await page.mouse.click(20, 700);

    await expect(palette.dialog).toBeHidden();
  });

  test('AC5: when nothing matches it says so', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, ada, { data: 'mock' });
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();
    await palette.openWithKeys();

    await palette.search('pastor mike');

    await expect(palette.none).toHaveText('Nothing matches “pastor mike”.');
    await expect(palette.options).toHaveCount(0);
  });

  test('AC6: a table the role may not read is never listed', async ({ page, jb }) => {
    const overview = new AdminOverviewPage(page);
    const palette = new JumpPaletteDialog(page);
    await overview.setWidth(1280);
    await stubAdminTables(page, miriam);
    await jb.gotoAdmin('/');
    await expect(overview.heading).toBeVisible();
    await palette.openWithKeys();

    await palette.search('staff');

    await expect(palette.none).toHaveText('Nothing matches “staff”.');
  });
});
