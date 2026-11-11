import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A table of rows to compare. The rows are native `thead`, `tbody` and `tr`; every cell is a
 * `jb-table-cell`:
 *
 *     <div jb-table-scroll>
 *       <table jb-table caption="Your products">
 *         <thead><tr><th jb-table-cell scope="col">Product</th></tr></thead>
 *         <tbody><tr><td jb-table-cell>Study Bible</td></tr></tbody>
 *       </table>
 *     </div>
 *
 * `caption` names the table for assistive technology and is not drawn.
 */
@Component({
  selector: 'table[jb-table]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'table', '[class.table--dense]': 'dense()' },
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class Table {
  readonly caption = input.required<string>();
  readonly dense = input(false, { transform: booleanAttribute });
}
