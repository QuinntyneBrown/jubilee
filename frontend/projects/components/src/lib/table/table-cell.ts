import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One value of a `jb-table`. `numeric` sets a figure to the right in tabular digits. */
@Component({
  selector: 'td[jb-table-cell]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'table__cell', '[class.num]': 'numeric()' },
  templateUrl: './table-cell.html',
  styleUrl: './table-cell.scss',
})
export class TableCell {
  readonly numeric = input(false, { transform: booleanAttribute });
}
