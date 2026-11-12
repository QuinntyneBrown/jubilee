import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { TileTint } from './category-tile';

/**
 * The media frame of a card: `<div jb-media-tile tint="gold" icon="bag" tag="Shop"></div>`.
 * Until a listing or product has a photo, the frame shows a tinted icon tile; with `photo` it
 * shows the photo, cropped to the frame. `size="thumb"` is the small tile beside a name in a row.
 *
 * A photo an owner uploaded is given by `photoKey`, the key of its renditions under `/media`
 * (320, 640 and 1280 pixels wide, WebP and JPEG; L2-088 AC4). The tile then draws a `picture`
 * with a `srcset` at the renditions' true widths, so each screen fetches the file that fits
 * (L2-221, L2-155):
 *
 *     <div jb-media-tile photoKey="9f…c2" photoAlt="The studio" [photoWidth]="1280"
 *          [photoHeight]="960" sizes="(min-width: 64rem) 40rem, 100vw" priority></div>
 *
 * Knobs: --jb-media-aspect-ratio, --jb-media-flex and --jb-media-min-height, set by a block that
 * stretches the frame (feature-grid); --jb-media-shadow, set by a card under the pointer.
 */
/** The widths every uploaded photo is kept at (L2-088 AC4). */
const RENDITION_WIDTHS = [320, 640, 1280] as const;

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
  /** The key of an uploaded photo's renditions; takes the place of `photo`. */
  readonly photoKey = input<string | null>(null);
  /** The width and height of the uploaded original, in pixels. No rendition is wider than it. */
  readonly photoWidth = input<number | null>(null);
  readonly photoHeight = input<number | null>(null);
  /** How wide the tile is drawn, as the `sizes` of the image, so the browser picks a rendition. */
  readonly sizes = input('100vw');
  /** The largest photo above the fold is fetched first; every other photo loads lazily (L2-155). */
  readonly priority = input(false, { transform: booleanAttribute });

  protected readonly webp = computed(() => this.srcset('webp'));
  protected readonly jpeg = computed(() => this.srcset('jpg'));

  /** The renditions with their true widths: a 500 pixel photo offers 320w and 500w, never 640w twice. */
  private srcset(extension: 'webp' | 'jpg'): string | null {
    const key = this.photoKey();
    if (!key) return null;
    const original = this.photoWidth() ?? Number.POSITIVE_INFINITY;
    const entries: string[] = [];
    let last = 0;
    for (const rendition of RENDITION_WIDTHS) {
      const width = Math.min(rendition, original);
      if (width > last) entries.push(`/media/${key}/${rendition}.${extension} ${width}w`);
      last = width;
    }
    return entries.join(', ');
  }
}
