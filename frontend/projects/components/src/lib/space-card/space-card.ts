import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { MediaTile } from '../media-tile/media-tile';
import { RatingInline } from '../rating-inline/rating-inline';
import { availability, formatRent, SpaceTermValue, TERM_BADGES, TERM_TILES } from './space-terms';

/** What a space card shows (L2-203). It never holds an exact address. */
export interface SpaceCardView {
  name: string;
  term: SpaceTermValue;
  rent: number;
  per: 'night' | 'month';
  facts: readonly string[];
  neighbourhood: string;
  available: string;
  coverPhoto?: string | null;
  /** The average and count from three reviews; absent below three (L2-231). */
  rating?: { average: number; count: number } | null;
}

let nextId = 0;

/**
 * A room or rental in a grid: `<a jb-space-card [space]="s" [routerLink]="['/b', s.slug]"></a>`.
 * The rent, the term and where come first. Its accessible name is the title; the term, the rent
 * and the neighbourhood are its description, in words (L2-203 AC3).
 */
@Component({
  selector: 'a[jb-space-card]',
  imports: [Icon, MediaTile, RatingInline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'space-card',
    '[attr.aria-labelledby]': 'id + "-t"',
    '[attr.aria-describedby]': 'id + "-b " + id + "-p " + id + "-a"',
  },
  templateUrl: './space-card.html',
  styleUrl: './space-card.scss',
})
export class SpaceCard {
  readonly space = input.required<SpaceCardView>();

  protected readonly id = `jb-space-${++nextId}`;
  protected readonly tile = computed(() => TERM_TILES[this.space().term]);
  protected readonly badge = computed(() => TERM_BADGES[this.space().term]);
  protected readonly rent = computed(() => formatRent(this.space().rent));
  protected readonly facts = computed(() => this.space().facts.slice(0, 2).join(' · '));
  protected readonly available = computed(() =>
    availability(this.space().term, this.space().available),
  );
}
