import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { FieldError } from './field-error';
import { FieldHelp } from './field-help';

let nextId = 0;

/**
 * A form field: label, optional hint, the control, then its error, in that order.
 *
 *     <div jb-field label="E-mail" controlId="email" required [error]="errors().email">
 *       <input class="input" jbFieldControl name="email" type="email" />
 *     </div>
 *
 * The control is projected and carries `jbFieldControl`: the field gives it its id and sets
 * `aria-describedby` and `aria-invalid` from the hint, the counter and the error. `controlId` is
 * for a page that names the field elsewhere (an error summary); without it the field makes one.
 * On a `fieldset` the label is the legend of a group of controls. An action that belongs to the
 * hint (a link, a button) is projected with `slot="hint"`; an action that stands on the line of
 * the label ("Forgot password?") with `slot="action"`. `hintAfter` puts the hint under the
 * control, and under its error, where two fields stand side by side and only one has a hint.
 */
@Component({
  selector: 'div[jb-field], fieldset[jb-field]',
  imports: [NgTemplateOutlet, FieldError, FieldHelp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field' },
  templateUrl: './field.html',
  styleUrl: './field.scss',
})
export class Field {
  protected readonly group =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'FIELDSET';

  /** Without a label the field only lays out what it holds (a loading placeholder). */
  readonly label = input<string | null>(null);
  /** The label names the control without being shown: the placeholder asks the question. */
  readonly labelHidden = input(false, { transform: booleanAttribute });
  readonly hint = input<string | null>(null);
  /** The hint stands under the control instead of above it. */
  readonly hintAfter = input(false, { transform: booleanAttribute });
  /** What to fix, when the value is refused; empty when it is not. */
  readonly error = input<string | null | undefined>(null);
  /** Marks the label "(optional)". */
  readonly optional = input(false, { transform: booleanAttribute });
  /** Marks the label "(required)". */
  readonly required = input(false, { transform: booleanAttribute });
  /** A marker in other words, such as "required for in person". */
  readonly marker = input<string | null>(null);
  /** The count under the control, such as "42 / 90"; it is announced politely. */
  readonly counter = input<string | null>(null);
  /** The count is over its limit. */
  readonly counterInvalid = input(false, { transform: booleanAttribute });
  readonly controlId = input(`jb-field-${nextId++}`);

  protected readonly shownMarker = computed(
    () => this.marker() ?? (this.required() ? 'required' : this.optional() ? 'optional' : null),
  );

  readonly helpId = computed(() => `${this.controlId()}-help`);
  readonly counterId = computed(() => `${this.controlId()}-count`);
  readonly errorId = computed(() => `${this.controlId()}-error`);

  /** The ids that describe the control, for its `aria-describedby`. */
  readonly describedBy = computed(() => {
    const ids = [
      this.hint() ? this.helpId() : null,
      this.counter() ? this.counterId() : null,
      this.error() ? this.errorId() : null,
    ].filter((id): id is string => id !== null);
    return ids.length ? ids.join(' ') : null;
  });
}
