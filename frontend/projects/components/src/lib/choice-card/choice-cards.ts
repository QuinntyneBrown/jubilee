import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The grid that holds the `jb-choice-card`s of one choice: one column, two from 640 px. */
@Component({
  selector: 'jb-choice-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'choice-cards' },
  templateUrl: './choice-cards.html',
  styleUrl: './choice-cards.scss',
})
export class ChoiceCards {}
