import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  EmptyState,
  Icon,
  Button,
  Input,
  List,
  InboxTools,
  ThreadRow,
  ThreadRowSkeleton,
} from 'components';
import { ClockService } from '../../services/clock.service';
import { MessagesStore } from '../../services/messages.store';
import { threadTime } from '../../services/message-time';
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
    Input,
    List,
    InboxTools,
    ThreadRow,
    ThreadRowSkeleton,
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

  constructor() {
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

  protected searchNow(event: Event): void {
    event.preventDefault();
    clearTimeout(this.timer);
    this.store.load(this.text().trim());
  }

  protected clear(): void {
    this.text.set('');
    this.store.load('');
  }

  protected time(iso: string): string {
    return threadTime(iso, this.clock.now());
  }
}
