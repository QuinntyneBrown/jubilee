import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * "Read-only" with a lock, beside the name of a table or in place of a record's actions (L2-284):
 * `<span jb-lock-tag></span>`, or `<span jb-lock-tag large></span>` among a record's actions.
 */
@Component({
  selector: 'span[jb-lock-tag]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lock-tag', '[class.lock-tag--lg]': 'large()' },
  templateUrl: './lock-tag.html',
  styleUrl: './lock-tag.scss',
})
export class LockTag {
  /** The size of a button, among a record's actions. */
  readonly large = input(false, { transform: booleanAttribute });
}
