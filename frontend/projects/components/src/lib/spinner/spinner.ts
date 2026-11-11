import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Work is under way and its length is not known:
 *
 *     <span jb-spinner size="lg"></span>
 *     <span jb-spinner label="Saving"></span>
 *
 * With a `label` it is an image with that name. Without one it is decoration, hidden from
 * assistive technology, for a place where the text beside it already says what is happening.
 */
@Component({
  selector: 'span[jb-spinner]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'spinner',
    '[class.spinner--sm]': "size() === 'sm'",
    '[class.spinner--lg]': "size() === 'lg'",
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label()',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
})
export class Spinner {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly label = input<string | null>(null);
}
