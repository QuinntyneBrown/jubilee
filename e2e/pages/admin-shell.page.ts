import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/**
 * The shell of the admin application (L2-188, L2-272): the ink top bar with the lockup, the jump,
 * the environment and the staff member; the sidebar of tables in their groups, a drawer under
 * 1024 px; and the states the shell shows in `main` itself (nothing for the role, not found).
 */
export class AdminShellPage extends ShellPage implements Screen {
  readonly adminTop: Locator;
  /** The lockup "jubilee" with "Admin", which opens the overview. */
  readonly home: Locator;
  readonly jump: Locator;
  /** The search button that stands in for the jump under 768 px. */
  readonly jumpButton: Locator;
  readonly address: Locator;
  readonly environment: Locator;
  /** The staff member's initials, which open their menu. */
  readonly staffButton: Locator;
  readonly staffMenu: Locator;
  /** The staff member's name and role over "Sign out". */
  readonly staffMenuLabel: Locator;
  readonly signOut: Locator;
  /** The sidebar beside the screen, from 1024 px. */
  readonly sidebar: Locator;
  readonly openTables: Locator;
  readonly drawer: Locator;
  readonly closeTables: Locator;
  readonly drawerScrim: Locator;
  readonly drawerFoot: Locator;
  readonly statusHeading: Locator;
  readonly statusText: Locator;

  constructor(page: Page) {
    super(page);
    this.adminTop = page.locator('header.admin-top');
    this.home = this.adminTop.getByRole('link', { name: 'Jubilee Admin home' });
    this.jump = this.adminTop.getByRole('button', { name: /Jump to a table or record/ });
    this.jumpButton = this.adminTop.getByRole('button', { name: 'Search', exact: true });
    this.address = this.adminTop.locator('.admin-top__env');
    this.environment = this.adminTop.locator('.admin-top__badge');
    this.staffButton = this.adminTop.locator('.admin-top__avatar');
    this.staffMenu = page.getByRole('menu', { name: 'Staff' });
    this.staffMenuLabel = this.staffMenu.locator('.menu__label');
    this.signOut = page.getByRole('menuitem', { name: 'Sign out' });
    this.sidebar = page.locator('.admin-app__side').getByRole('navigation', { name: 'Tables' });
    this.openTables = this.adminTop.getByRole('button', { name: 'Open tables' });
    this.drawer = page.getByRole('dialog', { name: 'Tables' });
    this.closeTables = this.drawer.getByRole('button', { name: 'Close tables' }).first();
    this.drawerScrim = this.drawer.locator('.admin-drawer__scrim');
    this.drawerFoot = this.drawer.locator('.admin-nav__foot');
    this.statusHeading = this.statusPage.getByRole('heading', { level: 1 });
    this.statusText = this.statusPage.locator('.empty__text');
  }

  /** The navigation of tables the screen shows: the sidebar, or the drawer when it is open. */
  nav(inDrawer = false): Locator {
    return inDrawer ? this.drawer.getByRole('navigation', { name: 'Tables' }) : this.sidebar;
  }

  /** The button of a group of the sidebar, which shows or hides its tables. */
  group(name: string, inDrawer = false): Locator {
    // A read-only group's lock is part of its name: "System Read-only".
    return this.nav(inDrawer).getByRole('button', { name: new RegExp(`^${name}(?: Read-only)?$`) });
  }

  /** Every group button of the sidebar, in order. */
  groups(inDrawer = false): Locator {
    return this.nav(inDrawer).locator('.admin-nav__group');
  }

  /** The link of a table, or of "Overview", in the sidebar. */
  tableLink(name: string, inDrawer = false): Locator {
    return this.nav(inDrawer).getByRole('link', { name: new RegExp(`^${name}\\b`) });
  }

  /** The count of records beside a table in the sidebar. */
  countOf(link: Locator): Locator {
    return link.locator('.admin-nav__count');
  }

  /** The lock that marks a group read-only. */
  lockOf(group: Locator): Locator {
    return group.getByRole('img', { name: 'Read-only' });
  }

  statusAction(name: string | RegExp): Locator {
    return this.statusPage
      .getByRole('link', { name })
      .or(this.statusPage.getByRole('button', { name }));
  }

  /** The top bar and the sidebar are the whole of the admin application's chrome. */
  override chromeRegions(): Region[] {
    return [
      { name: 'admin-top', locator: this.adminTop },
      { name: 'admin-nav', locator: this.sidebar },
    ];
  }

  async ready(): Promise<void> {
    await this.main.locator(':scope > *').first().waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
