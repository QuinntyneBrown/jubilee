import { CdkMenuItem } from '@angular/cdk/menu';
import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * One action of a `jb-menu`: `<button jb-menu-item icon="flag" (chosen)="report()">…</button>`.
 * A `hint` is set at the end of the line in the caption face, such as the start of an ID.
 */
@Component({
  selector: 'button[jb-menu-item]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: CdkMenuItem, outputs: ['cdkMenuItemTriggered: chosen'] }],
  host: { class: 'menu__item', type: 'button', '[class.menu__item--danger]': 'danger()' },
  templateUrl: './menu-item.html',
  styleUrl: './menu-item.scss',
})
export class MenuItem {
  readonly icon = input<IconName | null>(null);
  /** An action that removes or reports something. */
  readonly danger = input(false, { transform: booleanAttribute });
  readonly hint = input<string | null>(null);
}
