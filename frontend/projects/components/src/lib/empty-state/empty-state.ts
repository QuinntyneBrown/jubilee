import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Spinner } from '../spinner/spinner';

/**
 * The empty, no-results and load-error block:
 *
 *     <div jb-empty-state icon="store" heading="No businesses are listed yet">
 *       Text of the block.
 *       <a slot="actions" jb-button variant="primary" routerLink="/list">List your business</a>
 *     </div>
 *
 * `error` turns it into the load-error variant, announced as an alert. `level` is the heading
 * level: 1 when the block is the whole page, 2 inside a page, 3 inside a section. `compact` is
 * the smaller block that stands in for one section's content. `loading` draws a spinner in place
 * of the icon and announces the block as a status, for a page that is working something out.
 */
@Component({
  selector: 'div[jb-empty-state]',
  imports: [Icon, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'empty',
    '[class.empty--error]': 'error()',
    '[class.empty--compact]': 'compact()',
    '[attr.role]': 'error() ? "alert" : loading() || status() ? "status" : null',
  },
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly icon = input<IconName | null>(null);
  /** The title; a compact block that only says why a list is empty has none. */
  readonly heading = input<string | null>(null);
  readonly level = input<1 | 2 | 3>(2);
  readonly compact = input(false, { transform: booleanAttribute });
  readonly error = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  /** Announces the block as a status: it replaced a list the member just filtered. */
  readonly status = input(false, { transform: booleanAttribute });
}
