import { computed, Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AdminRouteData } from '../app.routes';
import { StaffSessionService } from './staff-session.service';

const BARE: AdminRouteData = { shell: 'bare', page: '' };

interface Screen {
  data: AdminRouteData;
  /** The table the sidebar marks. */
  current: string | null;
}

/**
 * What the deepest activated route says about the screen, read again after every navigation: its
 * data, the table the sidebar marks, and the role the screen needs when the staff member does not
 * hold it (L2-188 AC4).
 */
@Injectable({ providedIn: 'root' })
export class AdminRouteService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(StaffSessionService);

  private readonly screen = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map((): Screen => {
        let route = this.route.snapshot;
        while (route.firstChild) route = route.firstChild;
        const value = route.data as Partial<AdminRouteData>;
        if (!value.shell) return { data: BARE, current: null };
        return {
          data: value as AdminRouteData,
          current: route.paramMap.get('table') ?? value.current ?? null,
        };
      }),
    ),
    { initialValue: { data: BARE, current: null } },
  );

  readonly data = computed(() => this.screen().data);
  readonly current = computed(() => this.screen().current);

  readonly notForRole = computed(() => {
    const role = this.data().role;
    return role && !(this.session.staff()?.roles.includes(role) ?? false) ? role : null;
  });
}
