import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

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
 * the smaller block that stands in for one section's content.
 */
@Component({
  selector: 'div[jb-empty-state]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'empty',
    '[class.empty--error]': 'error()',
    '[class.empty--compact]': 'compact()',
    '[attr.role]': 'error() ? "alert" : null',
  },
  templateUrl: './empty-state.html',
})
export class EmptyState {
  readonly icon = input.required<IconName>();
  readonly heading = input.required<string>();
  readonly level = input<1 | 2 | 3>(2);
  readonly compact = input(false);
  readonly error = input(false);
}
