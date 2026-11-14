import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../brand-mark/brand-mark';
import { Icon } from '../icon/icon';
import { Menu } from '../menu/menu';
import { MenuItem } from '../menu/menu-item';
import { MenuLabel } from '../menu/menu-label';

/** A table in the sidebar: its key (its path), its name and how many records it holds. */
export interface AdminNavTable {
  key: string;
  label: string;
  count: number;
}

/** A group of the sidebar (L2-272 AC2). */
export interface AdminNavGroup {
  name: string;
  readOnly: boolean;
  tables: readonly AdminNavTable[];
}

/** The staff member in the top bar: their initials, and their name and role for their menu. */
export interface AdminStaffMember {
  name: string;
  initials: string;
  role: string;
}

/** The screen the sidebar marks: "Overview", or a table by its key. */
export const OVERVIEW = 'overview';

/** The groups open on the overview (L2-272 AC3). */
const OPEN_ON_OVERVIEW = ['Accounts', 'Moderation'];

/**
 * The shell of every screen of the admin application (L2-272), drawn from the Magic Patterns design
 * "Jubilee Admin": the ink top bar, the sidebar of tables in their groups and the screen.
 *
 *     <jb-admin-shell [groups]="groups()" current="members" [staff]="staff()"
 *       address="admin.jubilee.to" environment="Production" (jump)="openJump()" (signOut)="signOut()">
 *       <router-outlet />
 *     </jb-admin-shell>
 *
 * The screen is `main#main`, and only it scrolls. Under 1024 px the sidebar is a drawer, a CDK
 * dialog that holds focus and closes with Escape, the scrim or "Close tables"; under 768 px the jump
 * field gives way to a search button. Each count is shortened at a thousand and named in full.
 */
@Component({
  selector: 'jb-admin-shell',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    BrandMark,
    Icon,
    CdkMenuTrigger,
    Menu,
    MenuItem,
    MenuLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'admin-app' },
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly dialog = inject(Dialog);

  readonly groups = input.required<readonly AdminNavGroup[]>();
  /** The key of the current table, `overview`, or null when the screen is neither. */
  readonly current = input<string | null>(null);
  readonly staff = input<AdminStaffMember | null>(null);
  /** The address of the admin application (L2-272 AC1). */
  readonly address = input('admin.jubilee.to');
  /** The environment: "Production" is drawn in red, any other name plainly. */
  readonly environment = input('Production');
  /** "Jump to a table or record", or the search button, was chosen (L2-273). */
  readonly jump = output<void>();
  readonly signOut = output<void>();

  private readonly drawerTemplate = viewChild.required<TemplateRef<unknown>>('drawer');
  private drawerRef: DialogRef<unknown> | null = null;

  protected readonly production = computed(() => this.environment() === 'Production');
  protected readonly staffName = computed(() => {
    const staff = this.staff();
    return staff ? `${staff.name}, ${staff.role}` : null;
  });

  /** The group that holds the current table. */
  private readonly currentGroup = computed(() => {
    const key = this.current();
    return this.groups().find((g) => g.tables.some((t) => t.key === key))?.name ?? null;
  });

  /** The groups shown open: the current table's always opens; the staff member opens the others. */
  protected readonly open = linkedSignal<string | null, ReadonlySet<string>>({
    source: this.currentGroup,
    computation: (group, previous) =>
      new Set([
        ...(previous?.value ?? (group ? [group, 'Moderation'] : OPEN_ON_OVERVIEW)),
        ...(group ? [group] : []),
      ]),
  });

  constructor() {
    // Moving to another screen closes the drawer.
    effect(() => {
      this.current();
      untracked(() => this.closeDrawer());
    });
  }

  protected isOpen(group: string): boolean {
    return this.open().has(group);
  }

  protected toggle(group: string): void {
    this.open.update((open) => {
      const next = new Set(open);
      if (!next.delete(group)) next.add(group);
      return next;
    });
  }

  protected countLabel(n: number): string {
    return `${n.toLocaleString('en-CA')} ${n === 1 ? 'record' : 'records'}`;
  }

  protected compact(n: number): string {
    if (n >= 10_000) return `${Math.round(n / 1000)}k`;
    if (n >= 1000) return `${(Math.floor(n / 100) / 10).toFixed(1)}k`;
    return String(n);
  }

  protected openDrawer(): void {
    if (this.drawerRef) return;
    this.drawerRef = this.dialog.open(this.drawerTemplate(), {
      ariaLabel: 'Tables',
      hasBackdrop: false,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      panelClass: 'admin-drawer__overlay',
    });
    this.drawerRef.closed.subscribe(() => (this.drawerRef = null));
  }

  protected closeDrawer(): void {
    this.drawerRef?.close();
  }
}
