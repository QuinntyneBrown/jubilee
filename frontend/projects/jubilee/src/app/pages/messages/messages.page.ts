import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState, Icon, Button, PageHeader } from 'components';
import { MessagesStore } from '../../services/messages.store';
import { NavigationStore } from '../../services/navigation.store';
import { InboxList } from './inbox-list';

/** The Messages page at /messages (L2-056): the member's conversations, newest first. */
@Component({
  selector: 'jb-messages-page',
  imports: [RouterLink, EmptyState, Icon, InboxList, Button, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './messages.page.html',
})
export class MessagesPage implements OnInit {
  protected readonly store = inject(MessagesStore);
  private readonly navigation = inject(NavigationStore);

  protected readonly subtitle = computed(() => {
    const inbox = this.store.state();
    if (inbox.status !== 'loaded') return 'Conversations with businesses and customers.';
    if (this.store.search()) return 'Conversations with businesses and customers.';
    const { totalCount, unreadCount } = inbox.value;
    if (totalCount === 0) return 'No conversations yet';
    const noun = totalCount === 1 ? 'conversation' : 'conversations';
    return `${totalCount} ${noun} · ${unreadCount} unread`;
  });

  protected readonly isEmpty = computed(() => {
    const inbox = this.store.state();
    return inbox.status === 'loaded' && inbox.value.totalCount === 0 && !this.store.search();
  });

  ngOnInit(): void {
    this.store.load('');
    this.navigation.load();
  }
}
