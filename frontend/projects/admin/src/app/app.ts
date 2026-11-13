import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AdminBar, SkipLink, StaffChromeMember, ToastRegion } from 'components';
import { filter, map, skip, startWith } from 'rxjs';
import { AdminRouteData } from './app.routes';
import { AdminOnlyPage } from './pages/admin-only/admin-only.page';
import { StaffSessionService } from './services/staff-session.service';

const BARE: AdminRouteData = { shell: 'bare', page: '' };

/**
 * The root of the admin application (L2-188): the skip link, the admin bar and the routed screen
 * in `main`. A screen shows "Nothing here for your role" in its place to a staff member without
 * the role it needs, and is never loaded for them: the moderator role for the Jubilee team's
 * screens (L2-188 AC4), the admin role for the policies (L2-241 AC10).
 */
@Component({
  selector: 'jb-root',
  imports: [RouterOutlet, SkipLink, AdminBar, ToastRegion, AdminOnlyPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly session = inject(StaffSessionService);

  /** The data of the deepest activated route, read again after every navigation. */
  protected readonly routeData = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let route = this.route.snapshot;
        while (route.firstChild) route = route.firstChild;
        const value = route.data as Partial<AdminRouteData>;
        return value.shell ? (value as AdminRouteData) : BARE;
      }),
    ),
    { initialValue: BARE },
  );

  protected readonly staff = computed<StaffChromeMember | null>(() => this.session.staff());

  /** The role the screen needs, when the staff member does not hold it. */
  protected readonly notForRole = computed(() => {
    const role = this.routeData().role;
    return role && !(this.session.staff()?.roles.includes(role) ?? false) ? role : null;
  });

  constructor() {
    effect(() => {
      this.document.body.dataset['page'] = this.notForRole() ? 'admin-only' : this.routeData().page;
    });
    // Moving between screens reads the staff session again, so the count of the admin bar is
    // current; the first screen uses the session read at start-up (L2-190 AC7, ADR 0058).
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.session.refresh());
  }

  protected signOut(): void {
    this.session.signOut().subscribe(() => void this.router.navigate(['/signed-out']));
  }
}
