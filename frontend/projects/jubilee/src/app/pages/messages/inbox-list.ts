import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChildren,
  Injector,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  EmptyState,
  Icon,
  Button,
  List,
  InboxTools,
  ThreadRow,
  ThreadRowSkeleton,
  SearchField,
  ToastService,
} from 'components';
import { ClockService } from 'api';
import { MessagesStore } from '../../services/messages.store';
import { threadTime } from 'api';
import { RealtimeService } from '../../services/realtime.service';

const SEARCH_DELAY_MS = 250;

/**
 * The list of conversations with its search (L2-056, L2-059): the left column of the Messages
 * page and of an open conversation. The newest conversation comes first, an unread one says so
 * in words as well as with a dot.
 */
@Component({
  selector: 'jb-inbox-list',
  imports: [
    RouterLink,
    EmptyState,
    Icon,
    Button,
    List,
    InboxTools,
    ThreadRow,
    ThreadRowSkeleton,
    SearchField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inbox-list.html',
})
export class InboxList {
  protected readonly store = inject(MessagesStore);
  private readonly clock = inject(ClockService);

  /** The open conversation, marked as the current page in the list. */
  readonly selectedId = input<string | null>(null);

  protected readonly text = signal(this.store.search());
  /** What a screen reader is told about "Show more conversations" (L2-056 AC7). */
  protected readonly moreStatus = signal('');

  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly rows = viewChildren(ThreadRow, { read: ElementRef<HTMLElement> });

  constructor() {
    this.store.moreLoaded.pipe(takeUntilDestroyed()).subscribe((result) => {
      if (result === 'failed') {
        this.moreStatus.set('');
        this.toasts.show({
          tone: 'danger',
          title: 'We couldn’t load more conversations',
          text: 'Try again.',
        });
        return;
      }
      const noun = result.added === 1 ? 'conversation' : 'conversations';
      this.moreStatus.set(`${result.added} more ${noun} shown.`);
      // The button is gone once everything is listed: focus goes to the first row it added.
      if (!this.store.hasMore() && result.first) this.focusRow(result.first);
    });
    // A message that arrives changes a row, its place and what is unread (L2-056, L2-070).
    inject(RealtimeService)
      .received.pipe(takeUntilDestroyed())
      .subscribe((item) => {
        if (item.kind === 'message') this.store.load();
      });
  }

  private timer: ReturnType<typeof setTimeout> | undefined;

  protected typed(value: string): void {
    this.text.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.store.load(value.trim()), SEARCH_DELAY_MS);
  }

  protected searchNow(): void {
    clearTimeout(this.timer);
    this.store.load(this.text().trim());
  }

  protected clear(): void {
    this.text.set('');
    this.store.load('');
  }

  protected showMore(): void {
    if (this.store.loadingMore()) return;
    this.moreStatus.set('Loading more conversations…');
    this.store.loadMore();
  }

  private focusRow(id: string): void {
    afterNextRender(
      () =>
        this.rows()
          .find((row) => row.nativeElement.dataset['conversation'] === id)
          ?.nativeElement.focus(),
      { injector: this.injector },
    );
  }

  protected time(iso: string): string {
    return threadTime(iso, this.clock.now());
  }
}
