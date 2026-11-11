import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ACCOUNT_API } from 'api';
import {
  ChromeMember,
  SiteFooter,
  SkipLink,
  TabBar,
  TopBar,
  VerifyEmailBanner,
  VerifyEmailBannerState,
} from 'components';
import { filter, map, startWith } from 'rxjs';
import { JbRouteData } from './app.routes';
import { ClockService } from './services/clock.service';
import { NavigationStore } from './services/navigation.store';
import { SessionService } from './services/session.service';

const BARE: JbRouteData = { shell: 'bare', page: '' };

/** AppShell: the skip link, the top bar, the routed page in `main`, the footer and the tab bar. */
@Component({
  selector: 'jb-root',
  imports: [RouterOutlet, SkipLink, TopBar, SiteFooter, TabBar, VerifyEmailBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly session = inject(SessionService);
  private readonly navigation = inject(NavigationStore);
  private readonly account = inject(ACCOUNT_API);
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

  /** The banner that asks an unconfirmed member to confirm the address (L2-005 AC1). */
  protected readonly unconfirmed = computed(() => {
    const member = this.session.member();
    return member && !member.emailConfirmed ? member : null;
  });
  private readonly resent = signal(false);
  protected readonly resending = signal(false);
  protected readonly bannerState = computed<VerifyEmailBannerState>(() =>
    this.unconfirmed()?.emailBounced ? 'bounced' : this.resent() ? 'sent' : 'persistent',
  );

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
    // A Google member who has not agreed yet can do nothing else (L2-003 AC1). The address bar is
    // read, not the router, which has not finished the first navigation when the session resolves.
    effect(() => {
      const member = this.session.member();
      const { pathname, search } = this.document.location;
      if (member?.agreementRequired && !pathname.startsWith('/join/agreement')) {
        void this.router.navigate(['/join/agreement'], {
          queryParams: { returnUrl: pathname + search },
        });
      }
    });
  }

  protected resend(): void {
    this.resending.set(true);
    this.account.resendConfirmation().subscribe({
      next: () => {
        this.resent.set(true);
        this.resending.set(false);
      },
      error: () => this.resending.set(false),
    });
  }

  protected search(query: string): void {
    void this.router.navigate(['/search'], { queryParams: query ? { q: query } : {} });
  }
}
