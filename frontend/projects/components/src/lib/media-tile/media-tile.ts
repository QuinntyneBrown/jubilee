import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { TileTint } from './category-tile';

/**
 * The media frame of a card: `<div jb-media-tile tint="gold" icon="bag" tag="Shop"></div>`.
 * Until a listing or product has a photo, the frame shows a tinted icon tile; with `photo` it
 * shows the photo, cropped to the frame. `size="thumb"` is the small tile beside a name in a row.
 *
 * Knobs: --jb-media-aspect-ratio, --jb-media-flex and --jb-media-min-height, set by a block that
 * stretches the frame (feature-grid); --jb-media-shadow, set by a card under the pointer.
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
    '[class.media--thumb]': 'size() === "thumb"',
  },
  templateUrl: './media-tile.html',
  styleUrl: './media-tile.scss',
})
export class MediaTile {
  readonly tint = input<TileTint | null>(null);
  readonly icon = input<IconName | null>(null);
  readonly tag = input('');
  readonly shape = input<'landscape' | 'square'>('landscape');
  readonly size = input<'md' | 'thumb'>('md');
  /** The address of a photo that fills the frame in place of the icon. */
  readonly photo = input<string | null>(null);
  readonly photoAlt = input('');
  /** The photo's width and height in CSS pixels, so the page keeps its place while it loads. */
  readonly photoSize = input<number | null>(null);
}
