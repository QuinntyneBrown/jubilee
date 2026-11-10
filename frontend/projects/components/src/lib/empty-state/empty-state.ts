import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * The empty, no-results and load-error block:
 *
 *     <div jb-empty-state icon="store" heading="No businesses are listed yet">
 *       Text of the block.
 *       <a slot="actions" class="btn btn--primary" routerLink="/list">List your business</a>
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
  template: `
    <div class="empty__icon" aria-hidden="true"><svg jb-icon size="lg" [name]="icon()"></svg></div>
    @if (level() === 1) {
      <h1 class="empty__title">{{ heading() }}</h1>
    } @else if (level() === 2) {
      <h2 class="empty__title">{{ heading() }}</h2>
    } @else {
      <h3 class="empty__title">{{ heading() }}</h3>
    }
    <p class="empty__text"><ng-content /></p>
    <div class="empty__actions"><ng-content select="[slot=actions]" /></div>
  `,
})
export class EmptyState {
  readonly icon = input.required<IconName>();
  readonly heading = input.required<string>();
  readonly level = input<1 | 2 | 3>(2);
  readonly compact = input(false);
  readonly error = input(false);
}
