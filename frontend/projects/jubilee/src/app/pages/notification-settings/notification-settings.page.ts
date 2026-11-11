import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationPreferences, PROFILE_API, PreferenceFrequency, PreferenceSetting } from 'api';
import { EmptyState, Icon, Button } from 'components';
import { Observable } from 'rxjs';
import { LoadState, errorReference } from '../../services/load-state';
import { clockTime, monthYear } from '../../services/message-time';
import { SessionService } from '../../services/session.service';
import { ToastService } from '../../toasts/toast.service';

interface Row {
  setting: PreferenceSetting;
  key: 'messages' | 'requests' | 'reminders' | 'newBusinesses' | 'tips';
  id: string;
  title: string;
  meta: string;
}

const ROWS: Row[] = [
  {
    setting: 'messages',
    key: 'messages',
    id: 'n-msg',
    title: 'New messages',
    meta: 'E-mail me when a business or customer writes',
  },
  {
    setting: 'requests',
    key: 'requests',
    id: 'n-req',
    title: 'Request updates',
    meta: 'Confirmations, quotes and declines',
  },
  {
    setting: 'reminders',
    key: 'reminders',
    id: 'n-rem',
    title: 'Meeting reminders',
    meta: 'One hour before a booking',
  },
  {
    setting: 'new-businesses',
    key: 'newBusinesses',
    id: 'n-new',
    title: 'New businesses',
    meta: 'A weekly note about new listings in categories you’ve browsed',
  },
  {
    setting: 'tips',
    key: 'tips',
    id: 'n-tips',
    title: 'Tips for business owners',
    meta: 'Occasional advice on getting more from your listing',
  },
];

/**
 * NotificationSettingsPage at /account/notifications (L2-016, L2-149): five switches and "How
 * often". There is no save button; each change saves on its own and is applied at once, then put
 * back if the save fails. Only the changed row waits.
 */
@Component({
  selector: 'jb-notification-settings-page',
  imports: [RouterLink, EmptyState, Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './notification-settings.page.html',
})
export class NotificationSettingsPage implements OnInit {
  private readonly api = inject(PROFILE_API);
  private readonly session = inject(SessionService);
  private readonly toasts = inject(ToastService);

  protected readonly rows = ROWS;
  protected readonly state = signal<LoadState<NotificationPreferences>>({ status: 'loading' });
  protected readonly waiting = signal<ReadonlySet<string>>(new Set());
  protected readonly status = signal<
    { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: string }
  >({ kind: 'idle' });
  private readonly since = signal<string | null>(null);

  protected readonly subtitle = computed(() => {
    const name = this.session.member()?.displayName ?? '';
    const since = this.since();
    return since ? `${name} · member since ${monthYear(since)}` : name;
  });

  ngOnInit(): void {
    this.load();
    this.api.getAccount().subscribe({
      next: (account) => this.since.set(account.memberSince),
      error: () => undefined,
    });
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.getPreferences().subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-PREF-503') }),
    });
  }

  protected on(preferences: NotificationPreferences, row: Row): boolean {
    return preferences[row.key];
  }

  protected toggle(row: Row, enabled: boolean): void {
    this.change(
      row.setting,
      row.title,
      () => this.api.setSwitch(row.setting, enabled),
      (current) => ({
        ...current,
        [row.key]: enabled,
      }),
      (current) => ({ ...current, [row.key]: !enabled }),
    );
  }

  protected setFrequency(frequency: PreferenceFrequency): void {
    const was = this.loaded()?.frequency;
    if (!was || was === frequency) return;
    this.change(
      'frequency',
      'How often',
      () => this.api.setFrequency(frequency),
      (current) => ({ ...current, frequency }),
      (current) => ({ ...current, frequency: was }),
    );
  }

  private loaded(): NotificationPreferences | null {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  }

  /**
   * Applies the change at once, saves it alone, and puts it back when the save fails. The error
   * toast offers "Try again", which makes the same change again.
   */
  private change(
    key: string,
    label: string,
    save: () => Observable<NotificationPreferences>,
    apply: (value: NotificationPreferences) => NotificationPreferences,
    revert: (value: NotificationPreferences) => NotificationPreferences,
  ): void {
    const current = this.loaded();
    if (!current || this.waiting().has(key)) return;
    this.state.set({ status: 'loaded', value: apply(current) });
    this.waiting.update((set) => new Set(set).add(key));
    this.status.set({ kind: 'saving' });
    save().subscribe({
      next: () => {
        this.done(key);
        this.status.set({ kind: 'saved', at: clockTime(new Date().toISOString()) });
      },
      error: () => {
        this.done(key);
        const now = this.loaded();
        if (now) this.state.set({ status: 'loaded', value: revert(now) });
        this.status.set({ kind: 'idle' });
        this.toasts.show({
          tone: 'danger',
          title: `We couldn’t save “${label}”`,
          text: 'Your setting is back as it was. Check your connection.',
          action: { label: 'Try again', run: () => this.change(key, label, save, apply, revert) },
        });
      },
    });
  }

  private done(key: string): void {
    this.waiting.update((set) => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }
}
