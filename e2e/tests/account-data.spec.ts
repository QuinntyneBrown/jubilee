import type { Page } from '@playwright/test';
import { stubAccountData, type FakeAccountData } from '../fixtures/account-data';
import { expect, test, type Jb } from '../fixtures/jb-test';
import { stubProfile } from '../fixtures/profile';
import { AccountPage } from '../pages/account.page';
import { DataDownloadPage } from '../pages/data-download.page';
import { DeleteAccountDialog } from '../pages/delete-account.dialog';
import { Toasts } from '../pages/toasts';

test.describe('download your data (L2-018)', () => {
  test('AC1: asking for a download says the link arrives by e-mail within 24 hours', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member');
    await stubProfile(page);
    const fake = await stubAccountData(page);
    await jb.goto('/account');

    await expect(account.dataCard).toContainText('We e-mail you a link within 24 hours');
    await account.downloadData.click();

    await expect(account.dataWaiting).toContainText('We’re preparing your data');
    await expect(account.dataWaiting).toContainText('joanna.adeyemi@example.com');
    await expect(account.downloadData).toBeDisabled();
    expect(fake.exportRequests).toBe(1);
  });

  test('a request still waiting is shown after the page is opened again', async ({ page, jb }) => {
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member');
    await stubProfile(page);
    await stubAccountData(page, { exportState: 'requested' });
    await jb.goto('/account');

    await expect(account.dataWaiting).toContainText('We’re preparing your data');
    await expect(account.downloadData).toBeDisabled();
  });

  test('a request that fails says nothing was changed and can be tried again', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member');
    await stubProfile(page);
    const fake = await stubAccountData(page, { request: 'fails' });
    await jb.goto('/account');

    await account.downloadData.click();

    await expect(account.dataFailed).toContainText('We couldn’t start your download');
    await expect(account.downloadData).toBeEnabled();
    fake.request = 'ok';
    await account.downloadData.click();
    await expect(account.dataWaiting).toBeVisible();
  });

  test('AC7: an archive that could not be built says so, and the member can ask again', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member');
    await stubProfile(page);
    const fake = await stubAccountData(page, { exportState: 'failed' });
    await jb.goto('/account');

    await expect(account.dataFailed).toContainText('We couldn’t prepare your data');
    await expect(account.dataFailed).toContainText(
      'Something went wrong while we put your file together, and the Jubilee team has been told. Ask again, or write to help@jubilee.example.',
    );
    await account.downloadData.click();

    await expect(account.dataWaiting).toContainText('We’re preparing your data');
    await expect(account.dataFailed).toHaveCount(0);
    expect(fake.exportRequests).toBe(1);
  });

  test('AC2: the e-mailed link downloads the file and takes the token off the address', async ({
    page,
    jb,
  }) => {
    const download = new DataDownloadPage(page);
    await download.setWidth(1280);
    await jb.signInAs('member');
    const fake = await stubAccountData(page);
    const saved = page.waitForEvent('download');
    await jb.goto('/account/data/e2e-token');

    expect((await saved).suggestedFilename()).toBe('jubilee-data.json');
    await expect(download.subtitle).toHaveText('Your data was downloaded');
    await expect(download.done).toContainText('jubilee-data.json');
    expect(fake.downloads).toEqual(['e2e-token']);
    expect(page.url()).not.toContain('e2e-token');
  });

  test('AC2: a link that has expired or is not the member’s says so', async ({ page, jb }) => {
    const download = new DataDownloadPage(page);
    await download.setWidth(1280);
    await jb.signInAs('member');
    await stubAccountData(page, { download: 'unavailable' });
    await jb.goto('/account/data/old-token');

    await expect(download.unavailable).toContainText('This link has expired or isn’t yours');
    await expect(download.goToAccount).toBeVisible();
  });
});

test.describe('delete your account (L2-017)', () => {
  async function open(page: Page, jb: Jb, initial: Partial<FakeAccountData> = {}) {
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member');
    await stubProfile(page);
    const fake = await stubAccountData(page, initial);
    await jb.goto('/account');
    await account.deleteAccount.click();
    return { account, fake, dialog: new DeleteAccountDialog(page) };
  }

  test('AC1: the dialog names the account and counts what is deleted', async ({ page, jb }) => {
    const { dialog } = await open(page, jb);

    await expect(dialog.title).toHaveText('Delete your account?');
    await expect(dialog.description).toContainText('Joanna Adeyemi · joanna.adeyemi@example.com');
    await expect(dialog.consequences.nth(0)).toContainText(
      'Your profile, saved list and 4 conversations are deleted.',
    );
    await expect(dialog.consequences.nth(1)).toContainText(
      'Your 3 open requests are cancelled and the businesses are told.',
    );
    await expect(dialog.consequences.nth(2)).toHaveText('This can’t be undone.');
  });

  test('AC1: one conversation and one request are written in the singular', async ({
    page,
    jb,
  }) => {
    const { dialog } = await open(page, jb, { conversations: 1, openRequests: 1 });

    await expect(dialog.consequences.nth(0)).toContainText(
      'Your profile, saved list and 1 conversation is deleted.',
    );
    await expect(dialog.consequences.nth(1)).toContainText(
      'Your 1 open request is cancelled and the businesses are told.',
    );
  });

  test('AC2: anything but exactly DELETE shows the problem and deletes nothing', async ({
    page,
    jb,
  }) => {
    const { dialog, fake } = await open(page, jb);

    await dialog.confirmation.fill('delete my account');
    await dialog.delete.click();

    await expect(dialog.error).toHaveText('Type DELETE in capital letters to confirm.');
    await expect(dialog.confirmation).toHaveAttribute('aria-invalid', 'true');
    expect(fake.deletions).toEqual([]);
  });

  test('AC2: the server’s refusal is shown the same way', async ({ page, jb }) => {
    const { dialog, fake } = await open(page, jb, { deletion: 'mismatch' });

    await dialog.confirmation.fill('DELETE');
    await dialog.delete.click();

    await expect(dialog.error).toHaveText('Type DELETE in capital letters to confirm.');
    expect(fake.deletions).toEqual(['DELETE']);
  });

  test('AC3: typing DELETE deletes the account and lands on the welcome page with a toast', async ({
    page,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const { dialog, fake } = await open(page, jb);

    await dialog.confirmation.fill('DELETE');
    await dialog.delete.click();

    await expect(page).toHaveURL(/\/welcome$/);
    await expect(toasts.withTitle('Your account was deleted')).toBeVisible();
    expect(fake.deletions).toEqual(['DELETE']);
  });

  test('AC5: a failed deletion says nothing was removed and keeps what was typed', async ({
    page,
    jb,
  }) => {
    const { dialog } = await open(page, jb, { deletion: 'fails' });

    await dialog.confirmation.fill('DELETE');
    await dialog.delete.click();

    await expect(dialog.alert).toContainText('We couldn’t delete your account');
    await expect(dialog.alert).toContainText('Nothing was removed');
    await expect(dialog.confirmation).toHaveValue('DELETE');
    await expect(dialog.delete).toBeEnabled();
  });

  test('L2-128 AC2: a dropped connection says nothing was sent and keeps what was typed', async ({
    page,
    jb,
  }) => {
    const { dialog } = await open(page, jb, { deletion: 'offline' });

    await dialog.confirmation.fill('DELETE');
    await dialog.delete.click();

    await expect(dialog.alert).toContainText('We couldn’t delete your account');
    await expect(dialog.alert).toContainText(
      'Your connection dropped before it reached us. Nothing was sent and what you typed is still here. Try again.',
    );
    await expect(dialog.confirmation).toHaveValue('DELETE');
    await expect(dialog.delete).toBeEnabled();
  });

  test('Keep my account closes the dialog and changes nothing', async ({ page, jb }) => {
    const { dialog, fake, account } = await open(page, jb);

    await dialog.keep.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(account.deleteAccount).toBeFocused();
    expect(fake.deletions).toEqual([]);
  });

  test('a summary that cannot load says so and offers no deletion', async ({ page, jb }) => {
    const { dialog } = await open(page, jb, { summary: 'fails' });

    await expect(dialog.alert).toContainText('We couldn’t load your account');
    await expect(dialog.delete).toBeDisabled();
  });
});
