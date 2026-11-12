import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let nextId = 0;

const SCORES = [1, 2, 3, 4, 5] as const;

/**
 * A score of 1 to 5 as five native radios drawn as square buttons, one group named by `legend`,
 * which is not shown:
 *
 *     <fieldset jb-score-scale legend="Finding businesses, from 1 to 5"
 *               [value]="score()" clearable (valueChange)="score.set($event)"></fieldset>
 *
 * With `clearable`, pressing the chosen score again clears it and `valueChange` carries null.
 * `wide` shares a row of at most 24rem equally (the moment check-in).
 */
@Component({
  selector: 'fieldset[jb-score-scale]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'score-scale', '[class.score-scale--wide]': 'wide()' },
  templateUrl: './score-scale.html',
  styleUrl: './score-scale.scss',
})
export class ScoreScale {
  readonly legend = input.required<string>();
  readonly value = input<number | null>(null);
  readonly wide = input(false, { transform: booleanAttribute });
  readonly clearable = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly name = input(`jb-score-scale-${nextId++}`);
  readonly valueChange = output<number | null>();

  protected readonly scores = SCORES;

  /** A press on the score that is already chosen: a radio does not change, so the click says it. */
  protected pressed(score: number, radio: HTMLInputElement): void {
    if (!this.clearable() || this.value() !== score) return;
    radio.checked = false;
    this.valueChange.emit(null);
  }
}
