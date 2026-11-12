import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { MediaTile } from '../media-tile/media-tile';
import { Perk } from '../perk/perk';
import { SpaceCardView } from './space-card';
import { availability, formatRent, TERM_BADGES, TERM_TILES } from './space-terms';

/**
 * How renters will see a space that is not live yet (L2-197 AC3): the space card, with nothing
 * to follow, marked "Pending verification" until it is `verified`.
 *
 *     <div jb-space-card-preview [space]="preview()"></div>
 */
@Component({
  selector: 'div[jb-space-card-preview]',
  imports: [Icon, MediaTile, Perk],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'space-card' },
  templateUrl: './space-card-preview.html',
  styleUrl: './space-card-preview.scss',
})
export class SpaceCardPreview {
  readonly space = input.required<SpaceCardView>();
  readonly verified = input(false, { transform: booleanAttribute });

  protected readonly tile = computed(() => TERM_TILES[this.space().term]);
  protected readonly badge = computed(() => TERM_BADGES[this.space().term]);
  protected readonly rent = computed(() => formatRent(this.space().rent));
  protected readonly facts = computed(() => this.space().facts.slice(0, 2).join(' · '));
  protected readonly available = computed(() =>
    this.space().available ? availability(this.space().term, this.space().available) : '',
  );
}
