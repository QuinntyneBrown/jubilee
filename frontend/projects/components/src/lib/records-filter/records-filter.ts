import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Chip } from '../chip/chip';
import { ChipRow } from '../chip/chip-row';

/**
 * The status chips of a table of the admin application (L2-277 AC2): "All" and each status,
 * capitalised, in a group named "Filter by {field}"; the chosen chip is pressed.
 *
 *     <div jb-records-filter field="status" [options]="['active', 'unconfirmed']"
 *       [value]="status()" (chosen)="filter($event)"></div>
 *
 * `value` is the status chosen, or null for All; `chosen` carries the choice the same way.
 */
@Component({
  selector: 'div[jb-records-filter]',
  imports: [Chip, ChipRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'records-filter', role: 'group', '[attr.aria-label]': "'Filter by ' + field()" },
  templateUrl: './records-filter.html',
  styleUrl: './records-filter.scss',
})
export class RecordsFilter {
  /** The status field's name, in lower case: "status". */
  readonly field = input.required<string>();
  readonly options = input.required<readonly string[]>();
  readonly value = input<string | null>(null);

  readonly chosen = output<string | null>();

  protected capitalise(option: string): string {
    return option.charAt(0).toUpperCase() + option.slice(1);
  }
}
