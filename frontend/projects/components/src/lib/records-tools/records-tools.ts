import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SearchField } from '../search-field/search-field';

/**
 * The tools above a table of the admin application (L2-277 AC1, L2-278 AC1): the search across
 * every field, and the Columns menu at the end.
 *
 *     <div jb-records-tools unit="members" [value]="q()" (typed)="search($event)">
 *       <button slot="columns" jb-button type="button">Columns 7</button>
 *     </div>
 *
 * The box is named "Search {unit}" and reads "Search {unit} by any field"; `typed` carries the
 * text at every change.
 */
@Component({
  selector: 'div[jb-records-tools]',
  imports: [SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'records-tools' },
  templateUrl: './records-tools.html',
  styleUrl: './records-tools.scss',
})
export class RecordsTools {
  /** What the table holds, in lower case: "members". */
  readonly unit = input.required<string>();
  readonly value = input('');

  readonly typed = output<string>();
}
