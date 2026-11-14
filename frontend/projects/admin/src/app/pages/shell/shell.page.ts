import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AdminNavGroup, AdminShell, AdminStaffMember } from 'components';
import { filter, skip } from 'rxjs';
import { AdminCatalogService } from '../../services/admin-catalog.service';
import { AdminRouteService } from '../../services/admin-route.service';
import { AdminScreenService } from '../../services/admin-screen.service';
import { JumpService } from '../../services/jump.service';
import { StaffSessionService } from '../../services/staff-session.service';
import { AdminOnlyPage } from '../admin-only/admin-only.page';

const ROLE_NAMES = { moderator: 'Moderator', admin: 'Administrator' } as const;

/**
 * The shell around every screen after sign-in (L2-188, L2-272): the top bar with the staff member,
 * and the sidebar of the tables the staff member may read with their counts, read when the shell
 * opens and again on each move between screens (ADR 0058). A screen whose role the staff member
 * lacks shows "Nothing here for your role" in its place, and is never loaded for them.
 */
@Component({
  selector: 'jb-shell-page',
  imports: [RouterOutlet, AdminShell, AdminOnlyPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.page.html',
  // ⌘K or Ctrl K opens "Jump to" from any screen of the shell (L2-273 AC1).
  host: { '(document:keydown)': 'jump.keydown($event)' },
})
export class ShellPage {
  private readonly router = inject(Router);
  private readonly session = inject(StaffSessionService);
  private readonly catalog = inject(AdminCatalogService);
  private readonly screenOutcome = inject(AdminScreenService).outcome;
  protected readonly route = inject(AdminRouteService);
  protected readonly jump = inject(JumpService);

  protected readonly environment = computed(
    () => this.session.staff()?.environment ?? 'Production',
  );

  protected readonly staff = computed<AdminStaffMember | null>(() => {
    const staff = this.session.staff();
    return staff
      ? {
          name: staff.displayName,
          initials: staff.initials,
          role: staff.roles.map((role) => ROLE_NAMES[role]).join(' · '),
        }
      : null;
  });

  protected readonly groups = computed<AdminNavGroup[]>(() =>
    (this.catalog.catalog()?.groups ?? []).map((group) => ({
      name: group.name,
      readOnly: group.readOnly,
      tables: group.tables.map((t) => ({ key: t.key, label: t.label, count: t.count })),
    })),
  );

  constructor() {
    this.catalog.refresh();
    effect(() => {
      if (!this.session.staff()) this.catalog.forget();
    });
    // Moving between screens reads the staff session and the catalog again, so what the shell
    // counts is current (L2-190 AC7, ADR 0058); the navigation that opened the shell uses what
    // was just read.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.screenOutcome.set(null);
        this.session.refresh();
        if (this.session.staff()) this.catalog.refresh();
      });
  }

  protected signOut(): void {
    this.session.signOut().subscribe(() => void this.router.navigate(['/signed-out']));
  }
}
