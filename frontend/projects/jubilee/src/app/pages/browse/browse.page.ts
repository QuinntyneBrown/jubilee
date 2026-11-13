import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIES, SpaceCard as SpaceCardModel, SpaceTerm } from 'api';
import {
  BusinessCard,
  CardGridSkeleton,
  CountPipe,
  DirectoryRow,
  EmptyState,
  Icon,
  ProductCard,
  Button,
  Chip,
  ChipRow,
  RowListSkeleton,
  Skeleton,
  List,
  Section,
  Hero,
  Band,
  FeatureGrid,
  FeatureGridItem,
  SearchField,
  Scroller,
  ScrollerItem,
  DirectoryGroup,
  DirectoryGroups,
  CardGrid,
  SpaceCard,
  TermFilter,
  Saveable,
} from 'components';
import { CardHearts } from '../../services/card-hearts';
import { ClockService } from 'api';
import { REQUIRES_CONNECTION } from '../../directives/requires-connection';
import { clockTime } from 'api';
import { ConnectionService } from '../../services/offline/connection.service';
import { DirectoryStore } from '../../services/directory.store';
import { SessionService } from '../../services/session.service';

/**
 * The browse home (L2-021, L2-022): the hero with the greeting or the tagline, the category
 * chips, the featured businesses, the rooms and places to stay (L2-201), products from the shops
 * and the directory grouped by category. A visitor sees the same directory with a join panel.
 */
@Component({
  selector: 'jb-browse-page',
  imports: [
    Saveable,
    RouterLink,
    BusinessCard,
    CardGridSkeleton,
    CountPipe,
    DirectoryRow,
    EmptyState,
    Icon,
    ProductCard,
    Button,
    Chip,
    ChipRow,
    RowListSkeleton,
    Skeleton,
    List,
    Section,
    Hero,
    Band,
    FeatureGrid,
    FeatureGridItem,
    SearchField,
    Scroller,
    ScrollerItem,
    DirectoryGroup,
    DirectoryGroups,
    CardGrid,
    SpaceCard,
    TermFilter,
  ],
  providers: [DirectoryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page' },
  templateUrl: './browse.page.html',
})
export class BrowsePage {
  /** The hearts of the cards (L2-041 AC7, ADR 0054). */
  protected readonly hearts = inject(CardHearts);
  private readonly connectivity = inject(ConnectionService);
  /** Search needs a connection: offline, the box of the hero is disabled and says why (L2-122). */
  protected readonly offline = this.connectivity.isOffline;
  protected readonly needsConnection = REQUIRES_CONNECTION;
  private readonly router = inject(Router);
  private readonly clock = inject(ClockService);
  protected readonly store = inject(DirectoryStore);
  protected readonly member = inject(SessionService).member;
  protected readonly categories = CATEGORIES;
  /** The term of the rooms shelf; it filters the spaces already loaded (L2-201 AC3). */
  protected readonly shelfTerm = signal<SpaceTerm | null>(null);

  /** "Morning" before 12:00, "Afternoon" from 12:00, "Evening" from 17:00, Toronto time. */
  protected readonly greeting = computed(() => {
    const member = this.member();
    if (!member) return 'Toronto’s Christian marketplace';
    const hour = this.clock.torontoHour();
    const part = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    return `${part}, ${member.firstName}`;
  });

  constructor() {
    this.hearts.attach();
    this.store.load();
    const connection = inject(ConnectionService);
    // The banner says which directory is on show while offline (L2-119 AC1), and the page reads the
    // directory again when the connection returns (L2-119 AC2).
    effect(() => {
      const savedAt = this.store.savedAt();
      connection.detail.set(
        savedAt
          ? `Showing the directory saved at ${sentenceEnd(clockTime(savedAt))} Search and messages will work again when you’re connected.`
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

  /** Up to four spaces of the chosen term, newest first, as the server ordered them. */
  protected shelf(spaces: readonly SpaceCardModel[]): SpaceCardModel[] {
    const term = this.shelfTerm();
    return spaces.filter((space) => term === null || space.term === term).slice(0, 4);
  }

  protected search(query: string): void {
    const q = query.trim();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }
}

/** A time that ends a sentence: "9:00 a.m." already has its full stop; "14:05" gets one. */
function sentenceEnd(time: string): string {
  return time.endsWith('.') ? time : `${time}.`;
}
