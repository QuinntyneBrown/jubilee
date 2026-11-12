import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { Lockup } from '../lockup/lockup';

/** A staff member as the admin bar shows them (L2-188 AC3). */
export interface StaffChromeMember {
  displayName: string;
  roles: readonly ('verifier' | 'admin')[];
  /** The listings ready to review (L2-098 criterion 3). */
  verificationCount: number;
}

/** The screen of the admin application the staff member is on. */
export type StaffSection = 'verifications' | 'reports' | 'featured' | null;

const ROLE_NAMES = { verifier: 'Verifier', admin: 'Administrator' } as const;

/**
 * The top bar of the admin application (L2-188): the lockup with its "admin" tag, the staff
 * navigation, the staff member's name and role, and "Sign out".
 *
 *     <header jb-admin-bar [staff]="staff()" current="reports" (signOut)="signOut()"></header>
 *
 * The navigation shows only to a verifier: the five screens are the verification team's. Under
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

  protected readonly verifier = computed(() => this.staff()?.roles.includes('verifier') ?? false);
  protected readonly roleNames = computed(() =>
    (this.staff()?.roles ?? []).map((role) => ROLE_NAMES[role]).join(' · '),
  );
}
