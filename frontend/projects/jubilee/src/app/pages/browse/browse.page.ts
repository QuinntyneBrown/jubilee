import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
  }

  protected search(event: Event, query: string): void {
    event.preventDefault();
    const q = query.trim();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }
}
