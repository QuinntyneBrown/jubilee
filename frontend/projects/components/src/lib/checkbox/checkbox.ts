import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * A checkbox with its text:
 *
 *     <jb-checkbox [(checked)]="keep">Keep me signed in</jb-checkbox>
 *
 * `controlId` names the box for a page that links to it (an error summary). A page that shows
 * an error for it sets `invalid` and gives the id of the error in `describedBy`.
 */
@Component({
  selector: 'jb-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
})
export class Checkbox {
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly controlId = input<string | null>(null);
  readonly name = input<string | null>(null);
  /** The id of what describes the box: its error. */
  readonly describedBy = input<string | null>(null);

  protected toggle(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
