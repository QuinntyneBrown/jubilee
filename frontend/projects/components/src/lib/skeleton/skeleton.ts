import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

export type SkeletonShape =
  | 'block'
  | 'text'
  | 'title'
  | 'h1'
  | 'avatar'
  | 'circle'
  | 'rect'
  | 'media'
  | 'square'
  | 'button'
  | 'input';

const SHAPE_CLASS: Record<SkeletonShape, string> = {
  block: '',
  text: 'skeleton--text',
  title: 'skeleton--title',
  h1: 'skeleton--h1',
  avatar: 'skeleton--avatar',
  circle: 'skeleton--circle',
  rect: 'skeleton--rect',
  media: 'skeleton--media',
  square: 'skeleton--square',
  button: 'skeleton--btn',
  input: 'skeleton--input',
};

/**
 * A placeholder for content that is loading, in the shape of what will replace it:
 *
 *     <span jb-skeleton shape="text" width="50"></span>
 *     <span jb-skeleton shape="button" size="sm"></span>
 *
 * It says nothing to assistive technology: the page announces "Loading…" itself and hides the
 * placeholders or leaves them empty.
 */
@Component({
  selector: 'span[jb-skeleton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'skeleton', '[class]': 'modifiers()', '[style.height]': 'height()' },
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('block');
  /** The width, in percent of the line; the shape's own width when not given. */
  readonly width = input<30 | 50 | 70 | null, unknown>(null, {
    transform: (value) =>
      (value === null || value === '' ? null : numberAttribute(value)) as 30 | 50 | 70 | null,
  });
  /** For a button: small, or as wide as its container. */
  readonly size = input<'sm' | 'md' | 'block'>('md');
  /** A height other than the shape's, as a CSS length (a map, a tall heading). */
  readonly height = input<string | null>(null);

  protected readonly modifiers = computed(() => {
    const width = this.width();
    const size = this.size();
    return [
      SHAPE_CLASS[this.shape()],
      width ? `skeleton--w${width}` : '',
      size === 'md' ? '' : `skeleton--btn-${size}`,
    ]
      .filter(Boolean)
      .join(' ');
  });
}
