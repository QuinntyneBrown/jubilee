import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { TileTint } from './category-tile';

/**
 * The media frame of a card: `<div jb-media-tile tint="gold" icon="bag" tag="Shop"></div>`.
 * Until a listing or product has a photo, the frame shows a tinted icon tile.
 */
@Component({
  selector: 'div[jb-media-tile]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'media',
    '[class.media--ink]': 'tint() === "ink"',
    '[class.media--gold]': 'tint() === "gold"',
    '[class.media--green]': 'tint() === "green"',
    '[class.media--blue]': 'tint() === "blue"',
    '[class.media--square]': 'shape() === "square"',
  },
  template: `
    @if (tag()) {
      <span class="media__tag">{{ tag() }}</span>
    }
    <svg jb-icon [name]="icon()"></svg>
  `,
})
export class MediaTile {
  readonly tint = input.required<TileTint>();
  readonly icon = input.required<IconName>();
  readonly tag = input('');
  readonly shape = input<'landscape' | 'square'>('landscape');
}
