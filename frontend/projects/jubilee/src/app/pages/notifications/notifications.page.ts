import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NOTIFICATIONS_API, NotificationItem, NotificationKind, NotificationList } from 'api';
import { EmptyState, Icon, IconName, Button, Skeleton, Card } from 'components';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { threadTime } from '../../services/message-time';
import { NavigationStore } from '../../services/navigation.store';
import { RealtimeService } from '../../services/realtime.service';
import { ToastService } from '../../toasts/toast.service';

const ICON: Record<NotificationKind, IconName> = {
  request: 'calendar',
  message: 'message',
  listing: 'store',
  account: 'check',
  reminder: 'calendar',
  business: 'store',
};

/** The notification centre at /notifications (L2-064): the member's events of the last 90 days, newest first. */
@Component({
  selector: 'jb-notifications-page',
  imports: [EmptyState, Icon, RouterLink, Button, Skeleton, Card],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './notifications.page.html',
})
export class NotificationsPage implements OnInit {
  private readonly api = inject(NOTIFICATIONS_API);
  private readonly router = inject(Router);
  private readonly clock = inject(ClockService);
  private readonly navigation = inject(NavigationStore);
  private readonly realtime = inject(RealtimeService);
  private readonly toasts = inject(ToastService);

  protected readonly skeleton = [1, 2, 3, 4, 5];
  protected readonly state = signal<LoadState<NotificationList>>({ status: 'loading' });
  protected readonly marking = signal(false);

  protected readonly list = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly subtitle = computed(() => {
    const state = this.state();
    if (state.status === 'loading') return 'Loading…';
    if (state.status === 'error') return 'Updates on your requests, messages and listing.';
    const { unread, items } = state.value;
    if (items.length === 0) return 'You’re all caught up';
    if (unread > 0) return `${unread} unread`;
    return `${items.length} ${items.length === 1 ? 'notification' : 'notifications'} · all read`;
  });

  constructor() {
    // A notification that arrives while the page is open joins the list (L2-070).
    let seen = this.realtime.arrivals();
    effect(() => {
      const arrivals = this.realtime.arrivals();
      if (arrivals !== seen) {
        seen = arrivals;
        this.refresh();
      }
    });
    inject(DestroyRef);
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.refresh();
  }

  private refresh(): void {
    this.api.list().subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-NTF-503') }),
    });
  }

  protected errorReference(): string {
    const state = this.state();
    return state.status === 'error' ? state.reference : '';
  }

  protected icon(item: NotificationItem): IconName {
    return ICON[item.kind] ?? 'bell';
  }

  protected when(item: NotificationItem): string {
    return threadTime(item.at, this.clock.now());
  }

  /** Opening an item goes to its target and marks it read (AC2). */
  protected open(event: Event, item: NotificationItem): void {
    event.preventDefault();
    if (!item.read) {
      this.update((list) => ({
        unread: Math.max(0, list.unread - 1),
        items: list.items.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
      }));
      this.api.markRead(item.id).subscribe({
        next: (count) => this.setBadge(count.unread),
        error: () => undefined,
      });
    }
    void this.router.navigateByUrl(item.target);
  }

  protected markAll(): void {
    if (this.marking()) return;
    this.marking.set(true);
    this.api.markAllRead().subscribe({
      next: () => {
        this.marking.set(false);
        this.update((list) => ({
          unread: 0,
          items: list.items.map((entry) => ({ ...entry, read: true })),
        }));
        this.setBadge(0);
      },
      error: () => {
        this.marking.set(false);
        this.toasts.show({
          tone: 'danger',
          title: 'Couldn’t mark them as read',
          text: 'Your notifications are unchanged. Try again.',
          action: { label: 'Try again', run: () => this.markAll() },
        });
      },
    });
  }

  private update(change: (list: NotificationList) => NotificationList): void {
    this.state.update((state) =>
      state.status === 'loaded' ? { status: 'loaded', value: change(state.value) } : state,
    );
  }

  private setBadge(unread: number): void {
    this.navigation.apply({ ...this.navigation.summary(), unreadNotificationCount: unread });
  }
}
