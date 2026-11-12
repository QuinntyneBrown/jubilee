import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/account`: the profile form and the sign-in and security rows (L2-013, L2-014, L2-015). */
export class AccountPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly emailHelp: Locator;
  readonly phone: Locator;
  readonly phoneHelp: Locator;
  readonly postalCode: Locator;
  readonly homeChurch: Locator;
  readonly homeChurchAddress: Locator;
  readonly homeChurchAddressHint: Locator;
  readonly pronounsHint: Locator;
  readonly pronouns: Locator;
  readonly lastSaved: Locator;
  readonly save: Locator;
  readonly discard: Locator;
  readonly saved: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly changeEmail: Locator;
  readonly passwordRow: Locator;
  readonly changePassword: Locator;
  /** The "Sign out" row of "Sign-in and security" (L2-011 AC4). */
  readonly signOutRow: Locator;
  /** What the row says about where the member is signed in. */
  readonly signedInOn: Locator;
  readonly signOutOthers: Locator;
  readonly signOut: Locator;
  readonly errorState: Locator;
  readonly tryAgain: Locator;
  readonly sectionTabs: Locator;
  readonly dataCard: Locator;
  readonly downloadData: Locator;
  readonly dataWaiting: Locator;
  readonly dataFailed: Locator;
  readonly deleteAccount: Locator;
  /** The card that holds "Delete account". */
  readonly dangerZone: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.firstName = this.main.getByLabel('First name');
    this.lastName = this.main.getByLabel('Last name');
    this.email = this.main.getByLabel('E-mail');
    this.emailHelp = this.main.locator('#email-help');
    this.phone = this.main.getByLabel('Phone');
    this.phoneHelp = this.main.locator('#phone-help');
    this.postalCode = this.main.getByLabel('Postal code');
    this.homeChurch = this.main.locator('#church');
    this.homeChurchAddress = this.main.locator('#church-address');
    this.homeChurchAddressHint = this.main.locator('#church-address-help');
    this.pronounsHint = this.main.locator('#pronouns-help');
    this.pronouns = this.main.getByLabel('Pronouns');
    this.lastSaved = this.main.locator('.form-actions .inline-status');
    this.save = this.main.getByRole('button', { name: /^(Save profile|Saving…)$/ });
    this.discard = this.main.getByRole('button', { name: 'Discard changes' });
    this.saved = this.main.locator('.alert--success');
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.changeEmail = this.main.getByRole('button', { name: 'Change e-mail' });
    this.passwordRow = this.main.locator('li.row').filter({ hasText: 'Password' });
    this.changePassword = this.main.getByRole('button', {
      name: /^(Change password|Set a password)$/,
    });
    this.signOutRow = this.main
      .locator('li.row')
      .filter({ has: page.locator('.row__title', { hasText: /^Sign out$/ }) });
    this.signedInOn = this.signOutRow.locator('.row__meta');
    this.signOutOthers = this.signOutRow.getByRole('button', { name: 'Sign out of other devices' });
    this.signOut = this.signOutRow.getByRole('button', { name: 'Sign out', exact: true });
    this.errorState = this.main.getByRole('alert').filter({ hasText: 'JB-ACC-503' });
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.sectionTabs = this.main.getByRole('navigation', { name: 'Account sections' });
    this.dataCard = this.main.locator('section[aria-labelledby="dat"]');
    this.downloadData = this.main.getByRole('button', { name: 'Download my data' });
    this.dataWaiting = this.dataCard.getByRole('status');
    this.dataFailed = this.dataCard.getByRole('alert');
    this.deleteAccount = this.main.getByRole('button', { name: 'Delete my account' });
    this.dangerZone = this.main.locator('.danger-zone');
  }

  errorOf(id: 'first' | 'last' | 'phone' | 'postal'): Locator {
    return this.main.locator(`#${id}-error`);
  }

  async ready(): Promise<void> {
    await this.firstName.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

/** The account after the other devices were signed out; the state has no address, so the screen signs them out. */
export class AccountOthersSignedOutScreen extends AccountPage {
  override async ready(): Promise<void> {
    await super.ready();
    // The mock is drawn in the state already.
    if ((await this.signedInOn.textContent())?.includes('only')) return;
    await this.signOutOthers.click();
    await this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Sign out of other devices' })
      .click();
    await this.page.locator('.toast').waitFor();
  }
}
