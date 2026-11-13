// Acceptance Test
// Traces to: L2-226, L2-188
// Description: the policies screens of the admin application: the four pages with their published
// version, the editor with its preview and kept versions, the publish and its failures, and the
// screens refused to a staff member without the admin role.
import { expect, test } from '../fixtures/jb-test';
import { defaultVersions, stubPolicies } from '../fixtures/policies';
import { daniel, miriam } from '../fixtures/staff';
import { AdminPoliciesPage } from '../pages/admin-policies.page';
import { AdminPolicyPage } from '../pages/admin-policy.page';

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

test.describe('the policy editor (L2-226)', () => {
  test('AC2: the editor shows the published text in fields and the kept versions', async ({
    page,
    jb,
  }) => {
    const editor = new AdminPolicyPage(page);
    await editor.setWidth(1280);
    await stubPolicies(page);
    await jb.gotoAdmin('/policies/privacy');

    await expect(editor.heading).toHaveText('Privacy');
    await expect(editor.subtitle).toHaveText(
      'Version 2 is published, since 9 Nov 2026. Publishing makes version 3; version 2 is kept.',
    );
    await expect(editor.title).toHaveValue('Privacy');
    await expect(editor.sections).toHaveCount(3);
    await expect(editor.sectionHeading(3)).toHaveValue('Privacy contact and your rights');
    await expect(editor.sectionText(1)).toHaveValue(/^- Your name, e-mail/);
    await expect(editor.publish).toHaveText('Publish version 3');
    await expect(editor.versionRows).toHaveText([
      /Version 2 · published\s*9 Nov 2026 by Daniel Osei/,
      /Version 1\s*Built in · 2 Nov 2026/,
    ]);
  });

  test('AC2: with only the built-in version, the kept versions say so', async ({ page, jb }) => {
    const editor = new AdminPolicyPage(page);
    await stubPolicies(page, {
      versions: { ...defaultVersions(), privacy: [defaultVersions().privacy[1]] },
    });
    await jb.gotoAdmin('/policies/privacy');

    await expect(editor.versions).toContainText(
      'Only the built-in first version so far. Each version you publish is kept here.',
    );
    await expect(editor.publish).toHaveText('Publish version 2');
  });

  test('AC2: sections are added and removed', async ({ page, jb }) => {
    const editor = new AdminPolicyPage(page);
    await stubPolicies(page);
    await jb.gotoAdmin('/policies/privacy');

    await editor.addSection.click();
    await expect(editor.sections).toHaveCount(4);
    await expect(editor.sectionHeading(4)).toBeFocused();

    await editor.removeSection(1).click();
    await expect(editor.sections).toHaveCount(3);
    await expect(editor.sectionHeading(1)).toHaveValue('Your choices');
  });

  test('AC3: the preview shows the draft as members will read it, dated today, and follows each change', async ({
    page,
    jb,
  }) => {
    const editor = new AdminPolicyPage(page);
    await editor.setWidth(1280);
    await stubPolicies(page);
    await jb.gotoAdmin('/policies/privacy');

    await expect(editor.previewNote).toHaveText('Preview of version 3. Not published yet.');
    await expect(editor.document.getByRole('heading', { level: 2 })).toHaveText('Privacy');
    await expect(editor.document).toContainText('Last updated 10 November 2026');
    await expect(
      editor.document.getByRole('link', { name: 'privacy@jubilee.example' }),
    ).toHaveAttribute('href', 'mailto:privacy@jubilee.example');

    await editor
      .sectionText(3)
      .fill('Write to our privacy contact at [privacy@jubilee.to](mailto:privacy@jubilee.to).');
    await editor.sectionHeading(3).fill('Privacy contact');

    await expect(editor.document.getByRole('heading', { level: 3 }).nth(2)).toHaveText(
      'Privacy contact',
    );
    await expect(editor.document.getByRole('link', { name: 'privacy@jubilee.to' })).toBeVisible();
  });

  test('AC4: a draft without a title, or a section without a heading or text, is refused in the fields and nothing is sent', async ({
    page,
    jb,
  }) => {
    const editor = new AdminPolicyPage(page);
    const fake = await stubPolicies(page);
    await jb.gotoAdmin('/policies/privacy');

    await editor.title.fill('');
    await editor.sectionHeading(2).fill('');
    await editor.sectionText(2).fill('');
    await editor.publish.click();

    await expect(editor.formAlert).toContainText('Fix the marked fields to publish');
    await expect(editor.fieldError(editor.title)).toHaveText('Give the page a title.');
    await expect(editor.fieldError(editor.sectionHeading(2))).toHaveText(
      'Give this section a heading.',
    );
    await expect(editor.fieldError(editor.sectionText(2))).toHaveText('Write this section’s text.');
    await expect(editor.title).toHaveAttribute('aria-invalid', 'true');
    expect(fake.published).toEqual([]);
  });

  test('AC9: an editor that fails to load says so with its reference', async ({ page, jb }) => {
    const editor = new AdminPolicyPage(page);
    const fake = await stubPolicies(page, { page: 'fails' });
    await jb.gotoAdmin('/policies/privacy');

    await expect(editor.error).toContainText('We couldn’t load this policy');
    await expect(editor.reference).toHaveText('JB-ADM-522');

    fake.page = 'ok';
    await editor.tryAgain.click();
    await expect(editor.title).toHaveValue('Privacy');
  });

  test('AC10: a moderator without the admin role cannot open the editor', async ({ page, jb }) => {
    const editor = new AdminPolicyPage(page);
    await stubPolicies(page, {}, miriam);
    await jb.gotoAdmin('/policies/privacy');

    await expect(editor.statusHeading).toHaveText('Nothing here for your role');
  });
});
