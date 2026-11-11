import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIES } from 'api';
import {
  BusinessCard,
  CardGridSkeleton,
  CountPipe,
  DirectoryRow,
  EmptyState,
  Icon,
  ProductCard,
} from 'components';
import { ClockService } from '../../services/clock.service';
import { RequiresConnection } from '../../directives/requires-connection';
import { clockTime } from '../../services/message-time';
import { ConnectionService } from '../../services/offline/connection.service';
import { DirectoryStore } from '../../services/directory.store';
import { SessionService } from '../../services/session.service';

/**
 * The browse home (L2-021, L2-022): the hero with the greeting or the tagline, the category
 * chips, the featured businesses, products from the shops and the directory grouped by
 * category. A visitor sees the same directory with a join panel.
 */
@Component({
  selector: 'jb-browse-page',
  imports: [
    RequiresConnection,
    RouterLink,
    BusinessCard,
    CardGridSkeleton,
    CountPipe,
    DirectoryRow,
    EmptyState,
    Icon,
    ProductCard,
  ],
  providers: [DirectoryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page' },
  templateUrl: './browse.page.html',
})
export class BrowsePage {
  private readonly router = inject(Router);
  private readonly clock = inject(ClockService);
  protected readonly store = inject(DirectoryStore);
  protected readonly member = inject(SessionService).member;
  protected readonly categories = CATEGORIES;
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  /** "Morning" before 12:00, "Afternoon" from 12:00, "Evening" from 17:00, Toronto time. */
  protected readonly greeting = computed(() => {
    const member = this.member();
    if (!member) return 'Toronto’s Christian marketplace';
    const hour = this.clock.torontoHour();
    const part = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    return `${part}, ${member.firstName}`;
  });

  constructor() {
    this.store.load();
    const connection = inject(ConnectionService);
    // The banner says which directory is on show while offline (L2-119 AC1), and the page reads the
    // directory again when the connection returns (L2-119 AC2).
    effect(() => {
      const savedAt = this.store.savedAt();
      connection.detail.set(
        savedAt
          ? `Showing the directory saved at ${clockTime(savedAt)}. Search and messages will work again when you’re connected.`
          : null,
      );
    });
    let seen = connection.returned();
    effect(() => {
      const now = connection.returned();
      if (now !== seen) {
        seen = now;
        this.store.load();
      }
    });
    inject(DestroyRef).onDestroy(() => connection.detail.set(null));
  }

  protected search(event: Event, query: string): void {
    event.preventDefault();
    const q = query.trim();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }
}
