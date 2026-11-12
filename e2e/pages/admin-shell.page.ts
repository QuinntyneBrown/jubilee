import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/**
 * The chrome of the admin application (L2-188): the admin bar with the lockup and its "admin" tag,
 * the staff navigation, the staff member's name and role, and "Sign out"; and the states the shell
 * shows in `main` itself (nothing for the role, not found).
 */
export class AdminShellPage extends ShellPage implements Screen {
  readonly adminBar: Locator;
  readonly tag: Locator;
  readonly staffNav: Locator;
  readonly staffName: Locator;
  readonly staffRole: Locator;
  readonly signOut: Locator;
  readonly statusHeading: Locator;
  readonly statusText: Locator;

  constructor(page: Page) {
    super(page);
    this.adminBar = page.locator('header.admin-bar');
    this.tag = this.adminBar.locator('.admin-bar__tag');
    this.staffNav = this.adminBar.getByRole('navigation', { name: 'Staff' });
    this.staffName = this.adminBar.locator('.admin-bar__name');
    this.staffRole = this.adminBar.locator('.admin-bar__role');
    this.signOut = page.getByRole('button', { name: 'Sign out' });
    this.statusHeading = this.statusPage.getByRole('heading', { level: 1 });
    this.statusText = this.statusPage.locator('.empty__text');
  }

  /** A link of the staff navigation. */
  navLink(name: string | RegExp): Locator {
    return this.staffNav.getByRole('link', { name });
  }

  badgeIn(link: Locator): Locator {
    return link.locator('.badge');
  }

  statusAction(name: string | RegExp): Locator {
    return this.statusPage
      .getByRole('link', { name })
      .or(this.statusPage.getByRole('button', { name }));
  }

  /** The admin bar is the whole of the admin application's chrome. */
  override chromeRegions(): Region[] {
    return [{ name: 'admin-bar', locator: this.adminBar }];
  }

  async ready(): Promise<void> {
    await this.main.locator(':scope > *').first().waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
