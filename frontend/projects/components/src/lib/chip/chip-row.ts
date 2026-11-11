import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A row of chips, on the list that holds them. It scrolls sideways on a phone and wraps from
 * 768 px. `plain` drops the space above it, for a row that follows a heading.
 *
 *     <ul jb-chip-row>
 *       <li><a jb-chip routerLink="/" selected>All</a></li>
 *     </ul>
 */
@Component({
  selector: 'ul[jb-chip-row]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chip-row', '[class.chip-row--plain]': 'plain()' },
  templateUrl: './chip-row.html',
  styleUrl: './chip-row.scss',
})
export class ChipRow {
  readonly plain = input(false, { transform: booleanAttribute });
}
