import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';

/**
 * The grid business and product cards sit in: `<ul jb-card-grid><li>…</li></ul>`. `columns` is
 * how many go on a row of the desktop layout, four unless the grid shares the page with a side
 * column.
 */
@Component({
  selector: 'ul[jb-card-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card-grid', '[class.card-grid--3]': 'columns() === 3' },
  templateUrl: './card-grid.html',
  styleUrl: './card-grid.scss',
})
export class CardGrid {
  readonly columns = input(4, { transform: numberAttribute });
}
