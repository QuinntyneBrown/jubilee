import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ChromeMember, SiteFooter, SkipLink, TabBar, TopBar } from 'components';
import { filter, map, startWith } from 'rxjs';
import { JbRouteData } from './app.routes';
import { ClockService } from './services/clock.service';
import { NavigationStore } from './services/navigation.store';
import { SessionService } from './services/session.service';

const BARE: JbRouteData = { shell: 'bare', page: '' };

/** AppShell: the skip link, the top bar, the routed page in `main`, the footer and the tab bar. */
@Component({
  selector: 'jb-root',
  imports: [RouterOutlet, SkipLink, TopBar, SiteFooter, TabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly session = inject(SessionService);
  private readonly navigation = inject(NavigationStore);
  protected readonly year = inject(ClockService).year();

  /** The data of the deepest activated route, read again after every navigation. */
  protected readonly routeData = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let route = this.route.snapshot;
        while (route.firstChild) route = route.firstChild;
        return (route.data as Partial<JbRouteData>).shell ? (route.data as JbRouteData) : BARE;
      }),
    ),
    { initialValue: BARE },
  );

  protected readonly member = computed<ChromeMember | null>(() => {
    const member = this.session.member();
    if (!member) return null;
    const summary = this.navigation.summary();
    return {
      displayName: member.displayName,
      initials: member.initials,
      ownsListing: summary.ownsListing,
      unreadConversationCount: summary.unreadConversationCount,
      unreadNotificationCount: summary.unreadNotificationCount,
    };
  });

  /** The query of the search page, kept in the top bar's search box (L2-029 AC5). */
  protected readonly searchQuery = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const tree = this.router.parseUrl(this.router.url);
        const onSearch = tree.root.children['primary']?.segments[0]?.path === 'search';
        return onSearch ? String(tree.queryParams['q'] ?? '') : '';
      }),
    ),
    { initialValue: '' },
  );

  constructor() {
    if (this.session.member()) this.navigation.load();
    effect(() => {
      this.document.body.dataset['page'] = this.routeData().page;
    });
  }

  protected search(query: string): void {
    void this.router.navigate(['/search'], { queryParams: query ? { q: query } : {} });
  }
}
