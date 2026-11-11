import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FieldError } from '../field/field-error';

/** One choice of a `jb-radio-group`. */
export interface RadioOption<T = string> {
  readonly value: T;
  readonly label: string;
  /** A second line under the label. */
  readonly hint?: string | null;
}

let nextId = 0;

/**
 * One choice among a few, on the fieldset that groups them:
 *
 *     <fieldset jb-radio-group legend="What’s wrong?" required [options]="reasons"
 *       [value]="reason()" (valueChange)="reason.set($event)" [error]="found.reason"></fieldset>
 *
 * The radios are native and share a name, so the arrow keys move within the group. `controlId`
 * names the group for a page that links to it: the options are `<controlId>-0`, `-1`, … and
 * the error is `<controlId>-error`.
 */
@Component({
  selector: 'fieldset[jb-radio-group]',
  imports: [FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-describedby]': 'error() ? errorId() : null',
    '[disabled]': 'disabled()',
  },
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.scss',
})
export class RadioGroup<T = string> {
  readonly legend = input.required<string>();
  readonly options = input.required<readonly RadioOption<T>[]>();
  readonly value = input<T | null>(null);
  readonly valueChange = output<T>();
  /** What to fix, when no choice was made; empty when there is nothing to fix. */
  readonly error = input<string | null | undefined>(null);
  /** Marks the legend "(required)". */
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly controlId = input(`jb-radio-group-${nextId++}`);
  /** The name the radios share; the group's id unless a form needs another. */
  readonly name = input<string | null>(null);

  protected readonly groupName = computed(() => this.name() ?? this.controlId());
  protected readonly errorId = computed(() => `${this.controlId()}-error`);
}
