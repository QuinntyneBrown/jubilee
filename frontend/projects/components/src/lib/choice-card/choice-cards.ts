import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';

/**
 * The grid that holds the `jb-choice-card`s of one choice: one column, two from 640 px, or three
 * from 768 px with `columns="3"` (what a member offers: products, services or a space).
 */
@Component({
  selector: 'jb-choice-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'choice-cards', '[class.choice-cards--3]': 'columns() === 3' },
  templateUrl: './choice-cards.html',
  styleUrl: './choice-cards.scss',
})
export class ChoiceCards {
  readonly columns = input(2, { transform: numberAttribute });
}
