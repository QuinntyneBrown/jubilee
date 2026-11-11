import { CdkMenu } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The list of actions a trigger opens, on the CDK menu: arrow keys move, Enter chooses and
 * Escape closes and returns focus to the trigger.
 *
 *     <button jb-button iconOnly aria-label="More" [cdkMenuTriggerFor]="actions">…</button>
 *     <ng-template #actions>
 *       <jb-menu label="Conversation">
 *         <button jb-menu-item icon="flag" (chosen)="report()">Report conversation</button>
 *       </jb-menu>
 *     </ng-template>
 */
@Component({
  selector: 'jb-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [CdkMenu],
  host: { class: 'menu', '[attr.aria-label]': 'label()' },
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu {
  /** What the actions are about; the menu's accessible name. */
  readonly label = input.required<string>();
}
