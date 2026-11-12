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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { ChatMessage, Conversation, MESSAGES_API, RepliesBand, RequestCard } from 'api';
import {
  Alert,
  AttachPhoto,
  Avatar,
  Button,
  Chip,
  EmptyState,
  Icon,
  Menu,
  MenuItem,
  MessageBubble,
  RequestCard as RequestCardItem,
  Badge,
  Chat,
  ChatHead,
  MessageThread,
  MessageDay,
  Composer,
  InboxLayout,
} from 'components';
import { ClockService } from 'api';
import { LoadState, errorReference } from 'api';
import { MessagesStore } from '../../services/messages.store';
import { awayDay, clockTime, dayHeading, dayKey, newKey } from 'api';
import { NavigationStore } from '../../services/navigation.store';
import { RealtimeService } from '../../services/realtime.service';
import { ConnectionService } from '../../services/offline/connection.service';
import { OfflineNavigation } from '../../services/offline/offline-navigation';
import { OfflineSnapshotStore } from '../../services/offline/offline-snapshot.store';
import { PhotoAttachmentService } from '../../services/photo-attachment.service';
import { OutgoingMessageQueue, QueuedMessage } from '../../services/offline/outgoing-message.queue';
import { QueueDrainer } from '../../services/offline/queue-drainer';
import {
  ReportConversationData,
  ReportConversationDialog,
} from '../../dialogs/report-conversation/report-conversation.dialog';
import { ToastService } from 'components';
import { InboxList } from '../messages/inbox-list';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

const REPLIES: Record<RepliesBand, string> = {
  'few-hours': 'usually replies within a few hours',
  day: 'usually replies within a day',
  'few-days': 'usually replies within a few days',
};

/** The menu hangs under "More", flush with its right edge. */
const MENU_POSITION: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
];

const STARTERS = ['Do you offer a first meeting?', 'What does it cost?', 'Can we meet by video?'];

/** A message of this member that the server has not confirmed yet (L2-058). */
interface Outgoing {
  key: string;
  body: string;
  status: 'sending' | 'failed';
  problem: string;
  photo: OutgoingPhoto | null;
}

/** The photo of a message on its way: what to upload, how to show it, and its id once it is stored. */
interface OutgoingPhoto {
  blob: Blob;
  preview: string;
  attachmentId: string | null;
}

type Entry =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'message'; id: string; message: ChatMessage; time: string }
  | { kind: 'request'; id: string; card: RequestCard }
  | { kind: 'outgoing'; id: string; outgoing: Outgoing }
  | { kind: 'queued'; id: string; queued: QueuedMessage };

/**
 * A conversation at /messages/:id (L2-057, L2-058): the latest messages, a composer, and an
 * instant, retryable send. A message appears at once as "Sending…" and a failed one offers
 * "Try again" with the same idempotency key, so a retry can never send it twice.
 */
@Component({
  selector: 'jb-conversation-page',
  imports: [
    FormDraftDirective,
    RouterLink,
    CdkMenuTrigger,
    EmptyState,
    Icon,
    InboxList,
    Button,
    Alert,
    Menu,
    MenuItem,
    MessageBubble,
    AttachPhoto,
    RequestCardItem,
    Chip,
    Avatar,
    Badge,
    Chat,
    ChatHead,
    MessageThread,
    MessageDay,
    Composer,
    InboxLayout,
  ],
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
  private readonly toasts = inject(ToastService);
  private readonly dialog = inject(Dialog);
  private readonly photos = inject(PhotoAttachmentService);
  private readonly realtime = inject(RealtimeService);

  protected readonly starters = STARTERS;
  protected readonly state = signal<LoadState<Conversation>>({ status: 'loading' });
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly hasMore = signal(false);
  /** The requests between the two, shown as cards among the messages. */
  protected readonly cards = signal<RequestCard[]>([]);
  protected readonly loadingEarlier = signal(false);
  protected readonly outgoing = signal<Outgoing[]>([]);
  protected readonly text = signal('');
  protected readonly id = signal('');
  protected readonly muted = signal(false);
  /** What a screen reader is told when a reply arrives (L2-057 AC5). */
  protected readonly announcement = signal('');
  /** The photo chosen in the composer and not sent yet (L2-060 AC5). */
  protected readonly attached = signal<{ blob: Blob; preview: string } | null>(null);
  /** New links to photos whose first link expired, and the photos that cannot be shown (L2-060 AC8). */
  private readonly renewedLinks = signal<Record<string, string | null>>({});
  protected readonly menuPosition = MENU_POSITION;

  private readonly composer = viewChild('composer', { read: ElementRef<HTMLElement> });
  private readonly more = viewChild('more', { read: ElementRef<HTMLElement> });

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

  /** The day the owner is back, while they are away; null once that day has come (L2-062). */
  protected readonly awayUntil = computed(() => this.awayDayOf(this.conversation()));

  /** The away toast that is showing, so that a second one is never put on top of it. */
  private awayToast: number | null = null;

  protected readonly entries = computed<Entry[]>(() => {
    const now = this.clock.now();
    const entries: Entry[] = [];
    let day = '';
    // Messages keep the order the server gave them; each request card goes before the first
    // message sent after it (L2-057 AC4).
    const cards = [...this.cards()].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
    const items: { at: string; message: ChatMessage | null; card: RequestCard | null }[] = [];
    for (const message of this.messages()) {
      while (cards.length > 0 && Date.parse(cards[0].sentAt) < Date.parse(message.sentAt)) {
        const card = cards.shift()!;
        items.push({ at: card.sentAt, message: null, card });
      }
      items.push({ at: message.sentAt, message, card: null });
    }
    for (const card of cards) items.push({ at: card.sentAt, message: null, card });
    for (const item of items) {
      const key = dayKey(item.at);
      if (key !== day) {
        day = key;
        entries.push({ kind: 'day', id: `day-${key}`, label: dayHeading(item.at, now) });
      }
      if (item.message) {
        const message = item.message;
        entries.push({ kind: 'message', id: message.id, message, time: clockTime(message.sentAt) });
      } else if (item.card) {
        entries.push({ kind: 'request', id: `request-${item.card.id}`, card: item.card });
      }
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
    // A reply, or a change to a request of this conversation, arrives over the event stream (ADR 0039).
    this.realtime.received.pipe(takeUntilDestroyed()).subscribe((item) => {
      if (this.state().status !== 'loaded') return;
      if (item.kind === 'message' && item.target === `/messages/${this.id()}`) this.refresh(true);
      else if (item.kind === 'request') this.refresh(false);
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

  protected open(): void {
    this.state.set({ status: 'loading' });
    this.outgoing.set([]);
    this.api.open(this.id()).subscribe({
      next: (conversation) => {
        this.messages.set(conversation.messages);
        this.cards.set(conversation.requests ?? []);
        this.hasMore.set(conversation.hasMore);
        this.muted.set(conversation.muted);
        this.state.set({ status: 'loaded', value: conversation });
        void this.snapshots.save(`conversation:${this.id()}`, conversation);
        // Opening marks the conversation read, so the counts change.
        this.store.load();
        this.navigation.load();
        this.tellAway();
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
    this.cards.set(saved.data.requests ?? []);
    this.hasMore.set(saved.data.hasMore);
    this.muted.set(saved.data.muted);
    this.state.set({ status: 'loaded', value: saved.data });
  }

  private awayDayOf(conversation: Conversation | null): string | null {
    const until = conversation?.awayUntil;
    const now = this.clock.now();
    return until && Date.parse(until) > now.getTime() ? awayDay(until, now) : null;
  }

  /**
   * The toast of L2-062 AC1, when the conversation opens and when a message is sent: the owner is
   * away until a day. Nothing is said once that day has come (AC2), and never twice at once.
   */
  private tellAway(): void {
    const conversation = this.conversation();
    const day = this.awayDayOf(conversation);
    if (!conversation || !day) return;
    if (this.toasts.toasts().some((toast) => toast.id === this.awayToast)) return;
    const firstName = conversation.counterpart.name.trim().split(' ')[0];
    this.awayToast = this.toasts.show({
      tone: 'info',
      title: `${firstName} is away until ${day}`,
      text: 'They’ll see your message when they’re back.',
    });
  }

  /** Reads the latest messages again without a loading state, and says so when a reply came. */
  private refresh(announce = false): void {
    this.api.open(this.id()).subscribe({
      next: (conversation) => {
        const known = new Set(this.messages().map((message) => message.id));
        const reply = [...conversation.messages]
          .reverse()
          .find((message) => !message.mine && !known.has(message.id));
        if (announce && reply) {
          // The same words twice are still two announcements.
          this.announcement.set('');
          setTimeout(() => this.announcement.set(`New message from ${reply.senderFirstName}`));
          // Reading it here is reading it: the inbox and the badge follow.
          this.store.load();
          this.navigation.load();
        }
        this.state.set({ status: 'loaded', value: conversation });
        this.cards.update((cards) => mergeCards(cards, conversation.requests ?? []));
        this.messages.set(conversation.messages);
        this.hasMore.set(conversation.hasMore);
        void this.snapshots.save(`conversation:${this.id()}`, conversation);
      },
      error: () => undefined,
    });
  }

  /** Saves the mute, then says so; "Undo" on the toast takes a mute back (L2-061). */
  protected setMuted(muted: boolean, announce = muted): void {
    this.api.mute(this.id(), muted).subscribe({
      next: () => {
        this.muted.set(muted);
        this.store.load();
        if (!announce) return;
        this.toasts.show({
          tone: 'success',
          title: 'Conversation muted',
          text: 'You won’t be e-mailed about new replies here.',
          action: { label: 'Undo', run: () => this.setMuted(false) },
        });
      },
      error: () =>
        this.toasts.show({
          tone: 'danger',
          title: muted
            ? 'We couldn’t mute this conversation'
            : 'We couldn’t unmute this conversation',
          text: 'Try again.',
        }),
    });
  }

  /** "Report conversation" (L2-063): a CDK dialog; closing it returns focus to "More". */
  protected report(): void {
    const conversation = this.conversation();
    if (!conversation) return;
    const ref = this.dialog.open<void, ReportConversationData>(ReportConversationDialog, {
      data: {
        conversationId: conversation.id,
        businessName: conversation.business.name,
        canBlock: conversation.canBlock,
      },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
      // The menu item that opened it is gone by then, so focus goes back to the menu's trigger.
      restoreFocus: false,
    });
    ref.closed.subscribe(() => this.more()?.nativeElement.focus());
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
        this.cards.update((cards) => mergeCards(page.requests ?? [], cards));
        this.hasMore.set(page.hasMore);
        this.loadingEarlier.set(false);
      },
      error: () => this.loadingEarlier.set(false),
    });
  }

  /** A photo was picked: check it, shrink it when it is large, and show it in the composer (L2-060). */
  protected async attach(file: File): Promise<void> {
    if ((await this.photos.typeOf(file)) && this.photos.needsShrinking(file)) {
      this.toasts.show({
        tone: 'warning',
        title: 'Photo is large',
        text: 'Shrinking it to 5 MB before sending.',
      });
    }
    const photo = await this.photos.prepare(file);
    if (!photo) {
      this.toasts.show({
        tone: 'danger',
        title: 'Photo couldn’t be attached',
        text: 'Use a JPG or PNG under 5 MB.',
      });
      return;
    }
    this.detach();
    this.attached.set({ blob: photo.blob, preview: URL.createObjectURL(photo.blob) });
  }

  protected detach(): void {
    const attached = this.attached();
    if (attached) URL.revokeObjectURL(attached.preview);
    this.attached.set(null);
  }

  /** The address a message's photo is shown from; null when it cannot be shown. */
  protected photoOf(message: ChatMessage): string | null {
    const attachment = message.attachment;
    if (!attachment) return null;
    const renewed = this.renewedLinks()[attachment.id];
    return renewed === undefined ? attachment.url : renewed;
  }

  /** A photo did not load: its five-minute link has run out, so ask once for a new one. */
  protected renewPhoto(message: ChatMessage): void {
    const id = message.attachment?.id;
    if (!id) return;
    if (id in this.renewedLinks()) {
      this.renewedLinks.update((links) => ({ ...links, [id]: null }));
      return;
    }
    this.renewedLinks.update((links) => ({ ...links, [id]: message.attachment!.url }));
    this.api.attachmentLink(this.id(), id).subscribe({
      next: (link) => this.renewedLinks.update((links) => ({ ...links, [id]: link.url })),
      error: () => this.renewedLinks.update((links) => ({ ...links, [id]: null })),
    });
  }

  /** "View photo": the full photo in a new tab, through a link made now. */
  protected viewPhoto(message: ChatMessage): void {
    const id = message.attachment?.id;
    if (!id) return;
    this.api.attachmentLink(this.id(), id).subscribe({
      next: (link) => window.open(link.url, '_blank', 'noopener'),
      error: () => this.renewedLinks.update((links) => ({ ...links, [id]: null })),
    });
  }

  protected suggest(starter: string): void {
    this.text.set(starter);
  }

  protected send(): void {
    const body = this.text().trim();
    const attached = this.attached();
    // A photo needs no text (L2-060 AC6); without either there is nothing to send.
    if (!body && !attached) return;
    const outgoing: Outgoing = {
      key: newKey(),
      body,
      status: 'sending',
      problem: '',
      photo: attached ? { ...attached, attachmentId: null } : null,
    };
    this.text.set('');
    this.attached.set(null);
    // Offline, or with Jubilee out of reach, a text message is kept on the device and sent later
    // (L2-120). A message with a photo is not queued (ADR 0039): it fails and offers "Try again".
    if (!outgoing.photo && this.connection.cannotDeliver()) {
      void this.queue.enqueue(this.id(), body, outgoing.key);
      return;
    }
    this.outgoing.update((list) => [...list, outgoing]);
    this.deliver(outgoing);
  }

  protected retry(outgoing: Outgoing): void {
    this.update(outgoing.key, { status: 'sending', problem: '' });
    const current = this.outgoing().find((item) => item.key === outgoing.key) ?? outgoing;
    this.deliver({ ...current, status: 'sending', problem: '' });
  }

  protected discard(outgoing: Outgoing): void {
    if (outgoing.photo) URL.revokeObjectURL(outgoing.photo.preview);
    this.outgoing.update((list) => list.filter((item) => item.key !== outgoing.key));
  }

  /** Uploads the photo, unless an earlier try already stored it, then sends the message (L2-060 AC7). */
  private deliver(outgoing: Outgoing): void {
    const photo = outgoing.photo;
    if (!photo || photo.attachmentId) {
      this.post(outgoing);
      return;
    }
    this.api.attach(this.id(), photo.blob).subscribe({
      next: (stored) => {
        const uploaded = { ...outgoing, photo: { ...photo, attachmentId: stored.id } };
        this.update(outgoing.key, { photo: uploaded.photo });
        this.post(uploaded);
      },
      error: (error: unknown) =>
        this.update(outgoing.key, { status: 'failed', problem: problemOf(error, true) }),
    });
  }

  private post(outgoing: Outgoing): void {
    const attachmentId = outgoing.photo?.attachmentId ?? undefined;
    this.api.send(this.id(), outgoing.body, outgoing.key, attachmentId).subscribe({
      next: (message) => {
        if (outgoing.photo) URL.revokeObjectURL(outgoing.photo.preview);
        this.outgoing.update((list) => list.filter((item) => item.key !== outgoing.key));
        this.messages.update((list) =>
          list.some((m) => m.id === message.id) ? list : [...list, message],
        );
        this.store.load();
        this.tellAway();
      },
      error: (error: unknown) => {
        if (
          !outgoing.photo &&
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

/** The cards already shown, with the ones just read in their place or added: a card is never shown twice. */
function mergeCards(shown: RequestCard[], read: RequestCard[]): RequestCard[] {
  const fresh = new Map(read.map((card) => [card.id, card]));
  const kept = shown.map((card) => fresh.get(card.id) ?? card);
  const known = new Set(shown.map((card) => card.id));
  return [...kept, ...read.filter((card) => !known.has(card.id))];
}

function problemOf(error: unknown, upload = false): string {
  if (upload && error instanceof HttpErrorResponse) {
    // The photo was scanned, or could not be, before anything was stored (L2-060 AC9).
    const code = (error.error as { code?: string } | null)?.code;
    if (error.status === 422 && code === 'FAILED_SCAN')
      return 'Not sent. This photo didn’t pass our safety check.';
    if (error.status === 503 && code === 'SCAN_UNAVAILABLE')
      return 'Not sent. We couldn’t check this photo just now.';
    if (error.status === 422) return 'Not sent. Use a JPG or PNG under 5 MB.';
  }
  if (error instanceof HttpErrorResponse) {
    const code = (error.error as { code?: string } | null)?.code;
    if (error.status === 429) return 'Not sent. You’re sending quickly; wait a few minutes.';
    if (error.status === 403 && code === 'EMAIL_UNCONFIRMED')
      return 'Not sent. Confirm your e-mail first.';
    if (error.status === 422) return 'Not sent. Check the message.';
  }
  return 'Not sent. Check your connection.';
}
