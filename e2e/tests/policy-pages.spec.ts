import { stubContent } from '../fixtures/content';
import { expect, test } from '../fixtures/jb-test';
import { HelpPage } from '../pages/help.page';
import { JoinPage } from '../pages/join.page';
import { PolicyPage } from '../pages/policy.page';
import { ShellPage } from '../pages/shell.page';

test.describe('statement of faith (L2-107)', () => {
  test('AC1: it shows the introduction, its sections, a link to Help and the date', async ({
    page,
    jb,
  }) => {
    const policy = new PolicyPage(page);
    await jb.goto('/statement-of-faith');

    await expect(policy.title).toHaveText('Statement of faith');
    await expect(policy.lead).toContainText('Jubilee is open to everyone as a customer');
    await expect(policy.sectionHeadings).toHaveText([
      'What we believe',
      'How we do business',
      'How listings stay honest',
    ]);
    await expect(policy.bullets).toHaveCount(4);
    await expect(policy.link('Help')).toHaveAttribute('href', '/help');
    await expect(policy.updated).toHaveText('Last updated 2 November 2026');
  });
});

test.describe('terms of use (L2-108)', () => {
  test('AC1: it shows its sections, says Jubilee takes no payment and shows the date', async ({
    page,
    jb,
  }) => {
    const policy = new PolicyPage(page);
    await jb.goto('/terms');

    await expect(policy.title).toHaveText('Terms of use');
    await expect(policy.sectionHeadings).toHaveText([
      'Your account',
      'Listings',
      'Requests and payment',
      'Conduct',
    ]);
    await expect(policy.text(/You need to be 18 or older and use your real name/)).toBeVisible();
    await expect(
      policy.text(/Jubilee does not take payment or hold funds; you pay the business directly\./),
    ).toBeVisible();
    await expect(policy.updated).toHaveText('Last updated 2 November 2026');
  });
});

test.describe('privacy notice (L2-109)', () => {
  test('AC1: it shows what we keep and the choices with links, with no section on church references, and the date', async ({
    page,
    jb,
  }) => {
    const policy = new PolicyPage(page);
    await jb.goto('/privacy');

    await expect(policy.title).toHaveText('Privacy');
    await expect(policy.sectionHeadings.filter({ hasText: /^What we keep$/ })).toBeVisible();
    await expect(policy.sectionHeadings.filter({ hasText: /^Church references$/ })).toHaveCount(0);
    await expect(policy.text(/Your home church is shown to no one\./)).toBeVisible();
    await expect(policy.sectionHeadings.filter({ hasText: /^Your choices$/ })).toBeVisible();
    await expect(policy.link('notification settings')).toHaveAttribute(
      'href',
      '/account/notifications',
    );
    await expect(policy.link('your account')).toHaveAttribute('href', '/account');
    await expect(policy.updated).toHaveText('Last updated 2 November 2026');
  });

  test('AC2: it names the privacy contact and how to ask for access or correction', async ({
    page,
    jb,
  }) => {
    const policy = new PolicyPage(page);
    await jb.goto('/privacy');

    await expect(policy.link('privacy@jubilee.example')).toHaveAttribute(
      'href',
      'mailto:privacy@jubilee.example',
    );
    await expect(
      policy.text(/see or correct the personal information we hold about you/),
    ).toBeVisible();
  });
});

test.describe('help (L2-110)', () => {
  test('AC1: it shows the five questions, the contact line and the e-mail link', async ({
    page,
    jb,
  }) => {
    const help = new HelpPage(page);
    await jb.goto('/help');

    await expect(help.title).toHaveText('Help');
    await expect(help.questions).toHaveText([
      'How does Jubilee keep listings honest?',
      'Does Jubilee take payment?',
      'Is it free?',
      'Who can see my messages?',
      'How do I report a listing?',
    ]);
    await expect(help.contactLine).toBeVisible();
    await expect(help.emailLink).toHaveAttribute('href', 'mailto:help@jubilee.example');
  });

  test('AC2: a question opens and closes by keyboard and says so with aria-expanded', async ({
    page,
    jb,
  }) => {
    const help = new HelpPage(page);
    await jb.goto('/help');
    const question = help.question('Is it free?');

    await expect(question).toHaveAttribute('aria-expanded', 'false');
    await expect(help.answer('Is it free?')).toBeHidden();
    await question.focus();
    await page.keyboard.press('Enter');
    await expect(question).toHaveAttribute('aria-expanded', 'true');
    await expect(help.answer('Is it free?')).toContainText('Joining, messaging and listing');
    await page.keyboard.press('Space');
    await expect(question).toHaveAttribute('aria-expanded', 'false');
    await expect(help.answer('Is it free?')).toBeHidden();
  });

  test('AC2: a link to an anchor opens that answer', async ({ page, jb }) => {
    const help = new HelpPage(page);
    await jb.goto('/help#how-do-i-report-a-listing');

    await expect(help.question('How do I report a listing?')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(help.answer('How do I report a listing?')).toContainText('Reports are private');
    await expect(help.question('How does Jubilee keep listings honest?')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

test.describe('reaching the pages', () => {
  test('a visitor reaches all four pages from the footer', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await jb.goto('/terms');

    await shell.footerLink('Help').click();
    await expect(page).toHaveURL(/\/help$/);
    await shell.footerLink('Privacy').click();
    await expect(page).toHaveURL(/\/privacy$/);
    await shell.footerLink('Statement of faith').click();
    await expect(page).toHaveURL(/\/statement-of-faith$/);
    await shell.footerLink('Terms').click();
    await expect(page).toHaveURL(/\/terms$/);
  });

  test('the terms open in a new tab from the join form without losing what was typed', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.goto('/join');
    await join.firstName.fill('Joanna');

    await expect(join.termsLink).toHaveAttribute('target', '_blank');
    await expect(join.firstName).toHaveValue('Joanna');
  });

  test('a page that cannot load says so and loads when tried again', async ({ page, jb }) => {
    const policy = new PolicyPage(page);
    const fake = await stubContent(page, { failures: 1 });
    await jb.goto('/terms');

    await expect(page.getByText('JB-CONT-503')).toBeVisible();
    await policy.tryAgain.click();

    await expect(policy.title).toHaveText('Terms of use');
    expect(fake.reads).toBe(2);
  });

  test('help that cannot load still shows the address to write to', async ({ page, jb }) => {
    const help = new HelpPage(page);
    await stubContent(page, { failures: 1 });
    await jb.goto('/help');

    await expect(help.errorState).toBeVisible();
    await expect(page.getByRole('link', { name: 'help@jubilee.example' })).toBeVisible();
    await help.tryAgain.click();
    await expect(help.title).toHaveText('Help');
  });
});
