import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * What to fix in a control. `jb-field` writes it for its own control; on its own it is the
 * error of a group the field does not wrap (a set of choices, a list of photos).
 */
@Component({
  selector: 'span[jb-field-error], p[jb-field-error]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field__error' },
  templateUrl: './field-error.html',
  styleUrl: './field-error.scss',
})
export class FieldError {}
