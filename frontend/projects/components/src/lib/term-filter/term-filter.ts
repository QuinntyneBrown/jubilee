import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Chip } from '../chip/chip';
import { ChipRow } from '../chip/chip-row';
import { SPACE_TERMS, SpaceTermValue, TERM_FILTER_LABELS } from '../space-card/space-terms';

/**
 * The term filter of rooms and rentals (L2-192 AC2): "Any length" and the four terms, each a
 * toggle whose state is `aria-pressed`. It says which term was chosen; the page filters.
 *
 *     <jb-term-filter [term]="term()" (termChange)="choose($event)" />
 */
@Component({
  selector: 'jb-term-filter',
  imports: [Chip, ChipRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './term-filter.html',
  styleUrl: './term-filter.scss',
})
export class TermFilter {
  /** The term chosen, or null for "Any length". */
  readonly term = input<SpaceTermValue | null>(null);
  readonly termChange = output<SpaceTermValue | null>();

  protected readonly terms = SPACE_TERMS;
  protected readonly labels = TERM_FILTER_LABELS;
}
