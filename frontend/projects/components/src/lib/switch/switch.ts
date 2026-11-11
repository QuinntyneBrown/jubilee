import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * A setting that is on or off, and takes effect at once:
 *
 *     <label for="mail-requests">Requests</label>
 *     <jb-switch controlId="mail-requests" [(checked)]="mail" />
 *
 * Its label is a `label` for `controlId`, or the text projected into it. `busy` says the
 * change is being saved.
 */
@Component({
  selector: 'jb-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'switch' },
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
})
export class Switch {
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly controlId = input<string | null>(null);

  protected toggle(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
