import { Dialog } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ACCOUNT_API, StatementDue, isRateLimited, tryAgainIn } from 'api';
import {
  ChromeMember,
  ConnectionBanner,
  ConnectionBannerKind,
  FeedbackLauncher,
  SiteFooter,
  SkipLink,
  TabBar,
  TopBar,
  VerifyEmailBanner,
  VerifyEmailBannerState,
} from 'components';
import { filter, map, startWith } from 'rxjs';
import { JbRouteData } from './app.routes';
import { AccountMenuData, AccountMenuDialog } from './dialogs/account-menu/account-menu.dialog';
import { openChangeUnconfirmedEmail } from './dialogs/change-unconfirmed-email/change-unconfirmed-email.dialog';
import type { FeedbackDialogData } from './dialogs/feedback/feedback.dialog';
import { ConnectionService, STATUS_URL } from './services/offline/connection.service';
import { QueueDrainer } from './services/offline/queue-drainer';
import { ClockService } from 'api';
import { NavigationStore } from './services/navigation.store';
import { RealtimeService } from './services/realtime.service';
import { SavedStore } from './services/saved.store';
import { SessionService } from './services/session.service';
import { ToastRegion } from 'components';

const BARE: JbRouteData = { shell: 'bare', page: '' };

/** AppShell: the skip link, the top bar, the routed page in `main`, the footer and the tab bar. */
@Component({
  selector: 'jb-root',
  imports: [
    ConnectionBanner,
    FeedbackLauncher,
    RouterOutlet,
    SkipLink,
    TopBar,
    SiteFooter,
    TabBar,
    VerifyEmailBanner,
    ToastRegion,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  protected readonly session = inject(SessionService);
  private readonly navigation = inject(NavigationStore);
  private readonly realtime = inject(RealtimeService);
  private readonly saved = inject(SavedStore);
  private readonly account = inject(ACCOUNT_API);
  private readonly dialog = inject(Dialog);
  protected readonly connection = inject(ConnectionService);
  private readonly drainer = inject(QueueDrainer);
  protected readonly statusUrl = STATUS_URL;
  /** The banner on show, if any: the connection's condition, or the notice that it came back. */
  protected readonly banner = computed<ConnectionBannerKind | null>(() => {
    const state = this.connection.state();
    if (state === 'offline' || state === 'unreachable' || state === 'slow') return state;
    return this.connection.backOnline() !== null ? 'back-online' : null;
  });
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
      email: member.email,
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
  /** "Try again in 42 minutes.", once the resend limit was reached (L2-005 AC5). */
  protected readonly resendWait = signal('');
  protected readonly bannerState = computed<VerifyEmailBannerState>(() =>
    this.unconfirmed()?.emailBounced
      ? 'bounced'
      : this.resendWait()
        ? 'limited'
        : this.resent()
          ? 'sent'
          : 'persistent',
  );

  /** Shown once when the address was unconfirmed and now is, until it is dismissed (L2-005 AC4, L2-067 AC2). */
  protected readonly confirmedBanner = signal(false);
  private wasUnconfirmed = false;

  /** Whether this load of the app has asked for the agreement to the updated statement of faith (L2-075 AC3, AC5). */
  private statementAsked = false;

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
    this.drainer.start();
    // The counts load when a member is there at start-up and again when one signs in.
    effect(() => {
      if (this.session.member()) this.navigation.load();
    });
    // The open connection runs for a signed-in member only (L2-070).
    effect(() => {
      if (this.session.member()) this.realtime.start();
      else this.realtime.stop();
    });
    // Nothing of a member's saved list stays on the device once no member is signed in: after
    // sign-out, after the server ended the session, and for a visitor (L2-041 AC10).
    effect(() => {
      if (!this.session.member()) this.saved.reset();
    });
    effect(() => {
      const unconfirmed = this.unconfirmed() !== null;
      if (this.wasUnconfirmed && !unconfirmed && this.session.member())
        this.confirmedBanner.set(true);
      this.wasUnconfirmed = unconfirmed;
    });
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
    // An owner who owes an agreement to the updated statement of faith is asked once per load of the
    // app (L2-075 AC3); "Not now" leaves it until the next one, and My business offers it meanwhile.
    effect(() => {
      const due = this.session.member()?.statementDue;
      if (!due || this.statementAsked) return;
      this.statementAsked = true;
      untracked(() => void this.askForStatement(due));
    });
  }

  private async askForStatement(due: StatementDue): Promise<void> {
    // The dialog is loaded when it is first needed, so it adds nothing to the first load.
    const { openStatementAgreement } =
      await import('./dialogs/statement-agreement/statement-agreement.dialog');
    openStatementAgreement(this.dialog, due);
  }

  protected dismissConfirmed(): void {
    this.confirmedBanner.set(false);
  }

  protected resend(): void {
    this.resending.set(true);
    this.account.resendConfirmation().subscribe({
      next: () => {
        this.resent.set(true);
        this.resending.set(false);
      },
      error: (error: unknown) => {
        if (isRateLimited(error)) this.resendWait.set(tryAgainIn(error));
        this.resending.set(false);
      },
    });
  }

  /** "Change e-mail" in the banner (L2-004 AC5): the unconfirmed address is replaced in a dialog. */
  protected changeEmail(opener: HTMLElement): void {
    openChangeUnconfirmedEmail(this.dialog, opener);
  }

  /** The account menu from the avatar (L2-019); focus returns to the avatar when it closes. */
  protected openAccountMenu(avatar: HTMLElement): void {
    const member = this.session.member();
    if (!member) return;
    const summary = this.navigation.summary();
    this.dialog.open<void, AccountMenuData>(AccountMenuDialog, {
      data: {
        displayName: member.displayName,
        initials: member.initials,
        email: member.email,
        ownsListing: summary.ownsListing,
      },
      ariaLabelledBy: 'dlg-title',
      ariaModal: true,
      backdropClass: 'backdrop',
      restoreFocus: avatar,
    });
  }

  /** The feedback panel from the launcher (L2-210); focus returns to the launcher when it closes. */
  protected async openFeedback(launcher: HTMLElement): Promise<void> {
    // The panel is loaded when it is first opened, so it adds nothing to the first load.
    const { FeedbackDialog } = await import('./dialogs/feedback/feedback.dialog');
    this.dialog.open<void, FeedbackDialogData>(FeedbackDialog, {
      data: { page: this.routeData().page },
      ariaLabelledBy: 'dlg-title',
      ariaModal: true,
      backdropClass: 'backdrop',
      restoreFocus: launcher,
    });
  }

  protected search(query: string): void {
    void this.router.navigate(['/search'], { queryParams: query ? { q: query } : {} });
  }
}
