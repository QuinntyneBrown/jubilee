import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { ControlSize, Input } from '../input/input';

let nextId = 0;

/**
 * A search box: a hidden label, the search icon and the input, in a form that is a `search`
 * landmark.
 *
 *     <form jb-search-field label="Search messages" placeholder="Search messages"
 *           [value]="text()" (typed)="typed($event)" (searched)="search($event)"></form>
 *
 * `typed` carries the text at every change, `searched` the text when the form is submitted
 * (Enter). A disabled box says why in its title and its description. A bar that sets the box on
 * ink colours the icon with `--jb-search-icon-color`.
 */
@Component({
  selector: 'form[jb-search-field]',
  imports: [Icon, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'search', role: 'search', '(submit)': 'submit($event)' },
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
})
export class SearchField {
  /** The accessible name of the box: "Search messages". */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  /** The text to show in the box. */
  readonly value = input('');
  readonly size = input<ControlSize>('md');
  readonly maxLength = input<number | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Why the box is disabled, said while it is. */
  readonly disabledReason = input<string | null>(null);

  readonly typed = output<string>();
  readonly searched = output<string>();

  protected readonly id = `jb-search-field-${nextId++}`;
  private readonly box = viewChild.required(Input);

  protected submit(event: Event): void {
    event.preventDefault();
    this.searched.emit(this.box().element.value);
  }
}
