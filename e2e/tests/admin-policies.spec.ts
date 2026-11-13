// Acceptance Test
// Traces to: L2-226, L2-188
// Description: the policies screens of the admin application: the four pages with their published
// version, the editor with its preview and kept versions, the publish and its failures, and the
// screens refused to a staff member without the admin role.
import { expect, test } from '../fixtures/jb-test';
import { stubPolicies } from '../fixtures/policies';
import { daniel, miriam } from '../fixtures/staff';
import { AdminPoliciesPage } from '../pages/admin-policies.page';

test.describe('the policies list (L2-226)', () => {
  test('AC1: an administrator sees the four pages with their published version, and Policies in the admin bar', async ({
    page,
    jb,
  }) => {
    const policies = new AdminPoliciesPage(page);
    await policies.setWidth(1280);
    await stubPolicies(page);
    await jb.gotoAdmin('/policies');

    await expect(policies.heading).toHaveText('Policies');
    await expect(policies.rows.locator('.row__title')).toHaveText([
      'Statement of faith',
      'Terms of use',
      'Privacy',
      'Help',
    ]);
    await expect(policies.meta('Privacy')).toHaveText(
      'Version 2 · published 9 Nov 2026 by Daniel Osei',
    );
    await expect(policies.meta('Terms of use')).toHaveText('Version 1 · built in · 2 Nov 2026');
    await expect(policies.navLink('Policies')).toHaveAttribute('aria-current', 'page');
    await expect(policies.navLink('Listings')).toHaveCount(0);
  });

  test('AC1: Edit opens the page in the editor', async ({ page, jb }) => {
    const policies = new AdminPoliciesPage(page);
    await stubPolicies(page);
    await jb.gotoAdmin('/policies');

    await policies.edit('Privacy').click();

    await expect(page).toHaveURL(/\/policies\/privacy$/);
  });

  test('AC9: a list that fails to load says so with its reference and Try again', async ({
    page,
    jb,
  }) => {
    const policies = new AdminPoliciesPage(page);
    const fake = await stubPolicies(page, { list: 'fails' });
    await jb.gotoAdmin('/policies');

    await expect(policies.error).toContainText('We couldn’t load the policies');
    await expect(policies.reference).toHaveText('JB-ADM-521');

    fake.list = 'ok';
    await policies.tryAgain.click();
    await expect(policies.rows).toHaveCount(4);
  });

  test('AC10: a moderator without the admin role is told the screen is not for their role, and has no Policies link', async ({
    page,
    jb,
  }) => {
    const policies = new AdminPoliciesPage(page);
    await policies.setWidth(1280);
    await stubPolicies(page, {}, miriam);
    await jb.gotoAdmin('/policies');

    await expect(policies.statusHeading).toHaveText('Nothing here for your role');
    await expect(policies.statusText).toHaveText(
      'Policies are for Jubilee administrators. Ask a Jubilee administrator to add the admin role to your staff account.',
    );
    await expect(policies.navLink('Policies')).toHaveCount(0);
    await expect(policies.navLink('Listings')).toBeVisible();
  });

  test('L2-188 AC4: an administrator without the moderator role has only Policies in the navigation', async ({
    page,
    jb,
  }) => {
    const policies = new AdminPoliciesPage(page);
    await policies.setWidth(1280);
    await stubPolicies(page);
    await jb.gotoAdmin('/listings');

    await expect(policies.statusHeading).toHaveText('Nothing here for your role');
    await expect(policies.staffNav.getByRole('link')).toHaveText(['Policies']);
  });

  test('L2-188 AC3: a staff member with both roles has the four screens', async ({ page, jb }) => {
    const policies = new AdminPoliciesPage(page);
    await policies.setWidth(1280);
    await stubPolicies(page, {}, { ...daniel, roles: ['moderator', 'admin'] });
    await jb.gotoAdmin('/policies');

    await expect(policies.staffNav.getByRole('link')).toHaveText([
      'Listings',
      'Reports',
      'Featured',
      'Policies',
    ]);
  });
});
