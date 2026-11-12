import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One row of `jb-score-rows`: a name and a detail, with the projected scale under or beside them. */
@Component({
  selector: 'li[jb-score-row]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'score-rows__row' },
  templateUrl: './score-row.html',
  styleUrl: './score-row.scss',
})
export class ScoreRow {
  readonly heading = input.required<string>();
  readonly detail = input<string | null>(null);
}
