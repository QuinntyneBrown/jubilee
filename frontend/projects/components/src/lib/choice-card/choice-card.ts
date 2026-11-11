import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * A radio drawn as a card, with an icon, a title and a line of text:
 *
 *     <jb-choice-cards>
 *       <jb-choice-card name="offer" icon="store" heading="Products"
 *         [checked]="kind() === 'products'" (selected)="kind.set('products')">
 *         A shop or online store.
 *       </jb-choice-card>
 *       …
 *     </jb-choice-cards>
 *
 * The cards of one choice share a `name`, so the arrow keys move between them.
 */
@Component({
  selector: 'jb-choice-card',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './choice-card.html',
  styleUrl: './choice-card.scss',
})
export class ChoiceCard {
  readonly name = input.required<string>();
  readonly heading = input.required<string>();
  readonly icon = input<IconName | null>(null);
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly controlId = input<string | null>(null);
  /** The card was chosen. */
  readonly selected = output<void>();
}
