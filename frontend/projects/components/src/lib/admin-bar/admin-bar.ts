import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { Lockup } from '../lockup/lockup';

/** A staff member as the admin bar shows them (L2-188 AC3). */
export interface StaffChromeMember {
  displayName: string;
  roles: readonly ('moderator' | 'admin')[];
  /** The unresolved reports (L2-105 AC1, L2-188 AC3). */
  reportCount: number;
}

/** The screen of the admin application the staff member is on. */
export type StaffSection = 'listings' | 'reports' | 'featured' | 'policies' | null;

const ROLE_NAMES = { moderator: 'Moderator', admin: 'Administrator' } as const;

/**
 * The top bar of the admin application (L2-188): the lockup with its "admin" tag, the staff
 * navigation, the staff member's name and role, and "Sign out".
 *
 *     <header jb-admin-bar [staff]="staff()" current="reports" (signOut)="signOut()"></header>
 *
 * The navigation shows "Listings", "Reports" and "Featured" to a moderator, the Jubilee team's
 * screens, and "Policies" to an administrator (L2-247); a staff member with both sees all four. Under
 * 768 px the navigation moves below the lockup as one row that scrolls sideways, and the name and
 * role give way to "Sign out".
 */
@Component({
  selector: 'header[jb-admin-bar]',
  imports: [RouterLink, Lockup, Badge, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'topbar topbar--ink admin-bar' },
  templateUrl: './admin-bar.html',
  styleUrl: './admin-bar.scss',
})
export class AdminBar {
  readonly staff = input.required<StaffChromeMember | null>();
  readonly current = input<StaffSection>(null);
  /** Emits when "Sign out" is chosen. */
  readonly signOut = output<void>();

  protected readonly moderator = computed(() => this.staff()?.roles.includes('moderator') ?? false);
  protected readonly admin = computed(() => this.staff()?.roles.includes('admin') ?? false);
  protected readonly roleNames = computed(() =>
    (this.staff()?.roles ?? []).map((role) => ROLE_NAMES[role]).join(' · '),
  );
}
