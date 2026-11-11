import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One column heading of a `jb-table`. `numeric` sets it over a column of figures. */
@Component({
  selector: 'th[jb-table-cell]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'table__head', '[class.num]': 'numeric()' },
  templateUrl: './table-head-cell.html',
  styleUrl: './table-head-cell.scss',
})
export class TableHeadCell {
  readonly numeric = input(false, { transform: booleanAttribute });
}
