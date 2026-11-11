import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The hint of a control. `jb-field` writes it from its `hint`; on its own it is a note beside
 * controls the field does not wrap.
 */
@Component({
  selector: 'span[jb-field-help], p[jb-field-help]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field__help' },
  templateUrl: './field-help.html',
  styleUrl: './field-help.scss',
})
export class FieldHelp {}
