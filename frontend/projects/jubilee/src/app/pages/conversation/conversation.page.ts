import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatMessage, Conversation, MESSAGES_API, RepliesBand } from 'api';
import { EmptyState, Icon, Button, Alert } from 'components';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { MessagesStore } from '../../services/messages.store';
import { clockTime, dayHeading, dayKey, initialsOf, newKey } from '../../services/message-time';
import { NavigationStore } from '../../services/navigation.store';
import { ConnectionService } from '../../services/offline/connection.service';
import { OfflineNavigation } from '../../services/offline/offline-navigation';
import { OfflineSnapshotStore } from '../../services/offline/offline-snapshot.store';
import { OutgoingMessageQueue, QueuedMessage } from '../../services/offline/outgoing-message.queue';
import { QueueDrainer } from '../../services/offline/queue-drainer';
import { InboxList } from '../messages/inbox-list';

const REPLIES: Record<RepliesBand, string> = {
  'few-hours': 'usually replies within a few hours',
  day: 'usually replies within a day',
  'few-days': 'usually replies within a few days',
};

const STARTERS = ['Do you offer a first meeting?', 'What does it cost?', 'Can we meet by video?'];

/** A message of this member that the server has not confirmed yet (L2-058). */
interface Outgoing {
  key: string;
  body: string;
  status: 'sending' | 'failed';
  problem: string;
}

type Entry =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'message'; id: string; message: ChatMessage; time: string }
  | { kind: 'outgoing'; id: string; outgoing: Outgoing }
  | { kind: 'queued'; id: string; queued: QueuedMessage };

/**
 * A conversation at /messages/:id (L2-057, L2-058): the latest messages, a composer, and an
 * instant, retryable send. A message appears at once as "Sending…" and a failed one offers
 * "Try again" with the same idempotency key, so a retry can never send it twice.
 */
@Component({
  selector: 'jb-conversation-page',
  imports: [FormsModule, RouterLink, EmptyState, Icon, InboxList, Button, Alert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conversation.page.html',
})
export class ConversationPage implements OnInit {
  private readonly api = inject(MESSAGES_API);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clock = inject(ClockService);
  private readonly store = inject(MessagesStore);
  private readonly navigation = inject(NavigationStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly connection = inject(ConnectionService);
  private readonly queue = inject(OutgoingMessageQueue);
  private readonly drainer = inject(QueueDrainer);
  private readonly snapshots = inject(OfflineSnapshotStore);
  private readonly offlinePage = inject(OfflineNavigation);

  protected readonly starters = STARTERS;
  protected readonly state = signal<LoadState<Conversation>>({ status: 'loading' });
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly hasMore = signal(false);
  protected readonly loadingEarlier = signal(false);
  protected readonly outgoing = signal<Outgoing[]>([]);
  protected readonly text = signal('');
  protected readonly id = signal('');

  private readonly composer = viewChild<ElementRef<HTMLElement>>('composer');

  protected readonly conversation = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly subtitle = computed(() => {
    const conversation = this.conversation();
    if (!conversation) return '';
    const replies = conversation.replies ? ` · ${REPLIES[conversation.replies]}` : '';
    return `${conversation.counterpart.name}${replies}`;
  });

  protected readonly entries = computed<Entry[]>(() => {
    const now = this.clock.now();
    const entries: Entry[] = [];
    let day = '';
    for (const message of this.messages()) {
      const key = dayKey(message.sentAt);
      if (key !== day) {
        day = key;
        entries.push({ kind: 'day', id: `day-${key}`, label: dayHeading(message.sentAt, now) });
      }
      entries.push({ kind: 'message', id: message.id, message, time: clockTime(message.sentAt) });
    }
    for (const queued of this.queue.items()) {
      if (queued.conversationId === this.id()) {
        entries.push({ kind: 'queued', id: `queued-${queued.sequence}`, queued });
      }
    }
    for (const outgoing of this.outgoing()) {
      entries.push({ kind: 'outgoing', id: outgoing.key, outgoing });
    }
    return entries;
  });

  constructor() {
    // Messages sent from the queue while this conversation is open appear in it (L2-120 AC2).
    let delivered = this.drainer.delivered();
    effect(() => {
      const now = this.drainer.delivered();
      if (now === delivered) return;
      delivered = now;
      this.refresh();
    });
    // Keep the newest message in view after the log changes.
    effect(() => {
      this.entries();
      queueMicrotask(() => this.composer()?.nativeElement.scrollIntoView?.({ block: 'end' }));
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id.set(params.get('id') ?? '');
      this.open();
    });
    this.store.load('');
  }

  protected initials(name: string): string {
    return initialsOf(name);
  }

  protected open(): void {
    this.state.set({ status: 'loading' });
    this.outgoing.set([]);
    this.api.open(this.id()).subscribe({
      next: (conversation) => {
        this.messages.set(conversation.messages);
        this.hasMore.set(conversation.hasMore);
        this.state.set({ status: 'loaded', value: conversation });
        void this.snapshots.save(`conversation:${this.id()}`, conversation);
        // Opening marks the conversation read, so the counts change.
        this.store.load();
        this.navigation.load();
      },
      error: (error: unknown) => {
        if (this.isOfflineFailure(error)) {
          void this.showSaved();
          return;
        }
        // A conversation that is not yours is not found, whoever asks (L2-057 AC6).
        if (error instanceof HttpErrorResponse && error.status === 404) {
          void this.router.navigate(['/404'], { skipLocationChange: true });
          return;
        }
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-MSG-502') });
      },
    });
  }

  private isOfflineFailure(error: unknown): boolean {
    return (
      (error instanceof HttpErrorResponse && error.status === 0) || this.connection.isOffline()
    );
  }

  /** With no connection, the copy of this conversation saved when it was last opened (L2-119). */
  private async showSaved(): Promise<void> {
    const saved = await this.snapshots.read<Conversation>(`conversation:${this.id()}`);
    if (!saved) {
      if (this.connection.isOffline()) this.offlinePage.show();
      else this.state.set({ status: 'error', reference: errorReference(null, 'JB-MSG-502') });
      return;
    }
    this.messages.set(saved.data.messages);
    this.hasMore.set(saved.data.hasMore);
    this.state.set({ status: 'loaded', value: saved.data });
  }

  /** Reads the latest messages again without a loading state. */
  private refresh(): void {
    this.api.open(this.id()).subscribe({
      next: (conversation) => {
        this.messages.set(conversation.messages);
        this.hasMore.set(conversation.hasMore);
        void this.snapshots.save(`conversation:${this.id()}`, conversation);
      },
      error: () => undefined,
    });
  }

  protected retryQueued(queued: QueuedMessage): void {
    void this.queue.retry(queued).then(() => this.drainer.drain(false));
  }

  protected discardQueued(queued: QueuedMessage): void {
    void this.queue.remove(queued);
  }

  protected loadEarlier(): void {
    const first = this.messages()[0];
    if (!first || this.loadingEarlier()) return;
    this.loadingEarlier.set(true);
    this.api.open(this.id(), first.id).subscribe({
      next: (page) => {
        this.messages.update((current) => [...page.messages, ...current]);
        this.hasMore.set(page.hasMore);
        this.loadingEarlier.set(false);
      },
      error: () => this.loadingEarlier.set(false),
    });
  }

  protected suggest(starter: string): void {
    this.text.set(starter);
  }

  protected onEnter(event: Event): void {
    const key = event as KeyboardEvent;
    if (key.shiftKey || key.isComposing) return;
    key.preventDefault();
    this.send();
  }

  protected send(event?: Event): void {
    event?.preventDefault();
    const body = this.text().trim();
    if (!body) return;
    const outgoing: Outgoing = { key: newKey(), body, status: 'sending', problem: '' };
    this.text.set('');
    // Offline, or with Jubilee out of reach, the message is kept on the device and sent later (L2-120).
    if (this.connection.cannotDeliver()) {
      void this.queue.enqueue(this.id(), body, outgoing.key);
      return;
    }
    this.outgoing.update((list) => [...list, outgoing]);
    this.deliver(outgoing);
  }

  protected retry(outgoing: Outgoing): void {
    this.update(outgoing.key, { status: 'sending', problem: '' });
    this.deliver({ ...outgoing, status: 'sending', problem: '' });
  }

  protected discard(outgoing: Outgoing): void {
    this.outgoing.update((list) => list.filter((item) => item.key !== outgoing.key));
  }

  private deliver(outgoing: Outgoing): void {
    this.api.send(this.id(), outgoing.body, outgoing.key).subscribe({
      next: (message) => {
        this.outgoing.update((list) => list.filter((item) => item.key !== outgoing.key));
        this.messages.update((list) =>
          list.some((m) => m.id === message.id) ? list : [...list, message],
        );
        this.store.load();
      },
      error: (error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 0 &&
          this.connection.cannotDeliver()
        ) {
          // No answer and the connection is down: keep it, with the same key, for the queue to send.
          this.outgoing.update((list) => list.filter((item) => item.key !== outgoing.key));
          void this.queue.enqueue(this.id(), outgoing.body, outgoing.key);
          return;
        }
        this.update(outgoing.key, { status: 'failed', problem: problemOf(error) });
      },
    });
  }

  private update(key: string, change: Partial<Outgoing>): void {
    this.outgoing.update((list) =>
      list.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  }
}

function problemOf(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const code = (error.error as { code?: string } | null)?.code;
    if (error.status === 429) return 'Not sent. You’re sending quickly; wait a few minutes.';
    if (error.status === 403 && code === 'EMAIL_UNCONFIRMED')
      return 'Not sent. Confirm your e-mail first.';
    if (error.status === 422) return 'Not sent. Check the message.';
  }
  return 'Not sent. Check your connection.';
}
