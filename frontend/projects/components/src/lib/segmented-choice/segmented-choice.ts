import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface SegmentedOption {
  readonly value: string;
  readonly label: string;
}

let nextId = 0;

/**
 * One choice of a few, drawn as segments on a track with a pill that slides to the chosen one (the
 * fit of the tee, L2-264 AC2). The segments are native radios sharing a name, so the arrow keys
 * move within the group; the note says what the chosen option means.
 *
 *     <fieldset jb-segmented-choice legend="Fit" name="fit" [options]="fits" [value]="fit()"
 *       [note]="note()" (valueChange)="fit.set($event)"></fieldset>
 */
@Component({
  selector: 'fieldset[jb-segmented-choice]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'segmented-choice',
    '[style.--segmented-count]': 'options().length',
    '[attr.aria-describedby]': 'noteId()',
  },
  templateUrl: './segmented-choice.html',
  styleUrl: './segmented-choice.scss',
})
export class SegmentedChoice {
  readonly legend = input.required<string>();
  readonly options = input.required<readonly SegmentedOption[]>();
  readonly value = input<string | null>(null);
  readonly note = input<string | null>(null);
  readonly name = input(`jb-segmented-${nextId++}`);
  readonly valueChange = output<string>();

  protected readonly noteId = computed(() => `${this.name()}-note`);
}
