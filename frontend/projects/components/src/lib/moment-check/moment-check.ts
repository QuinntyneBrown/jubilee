import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Button } from '../button/button';
import { Field } from '../field/field';
import { Icon } from '../icon/icon';
import { ScoreScale } from '../score-scale/score-scale';
import { Textarea } from '../textarea/textarea';

let nextId = 0;

/** The words at the two ends of the scores. */
const LOW = 'Very hard';
const HIGH = 'Very easy';

/**
 * One question after a moment that matters (L2-211): the question, the scores 1 to 5 between
 * "Very hard" and "Very easy", then a field and "Send" after a low score, or a line of thanks.
 *
 *     <div jb-moment-check question="How easy was it to send your request?"
 *          [score]="score()" [thanked]="thanked()"
 *          (scoreChange)="choose($event)" (sent)="send($event)"></div>
 *
 * The owner stores the answer: `scoreChange` carries a score the moment it is chosen and `sent`
 * the note with "Send". While a score is chosen and `thanked` is false the field shows.
 */
@Component({
  selector: 'div[jb-moment-check]',
  imports: [Button, Field, Icon, ScoreScale, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'moment-check' },
  templateUrl: './moment-check.html',
  styleUrl: './moment-check.scss',
})
export class MomentCheck {
  readonly question = input.required<string>();
  readonly score = input<number | null>(null);
  /** The answer is complete: the line of thanks shows instead of the field. */
  readonly thanked = input(false);
  /** The note is held to this many characters. */
  readonly noteMax = input(1000);
  readonly scoreChange = output<number>();
  /** "Send" was pressed, with the note as typed. */
  readonly sent = output<string>();

  protected readonly noteId = `jb-moment-check-${nextId++}`;
  protected readonly note = signal('');
  protected readonly legend = computed(
    () => `${this.question()} 1 is ${LOW.toLowerCase()}, 5 is ${HIGH.toLowerCase()}.`,
  );
  protected readonly low = LOW;
  protected readonly high = HIGH;

  protected choose(score: number | null): void {
    if (score !== null) this.scoreChange.emit(score);
  }
}
