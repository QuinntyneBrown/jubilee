import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { FieldControl } from '../field/field-control';
import { ControlSize } from '../input/input';

/**
 * A native select drawn as a control of the design system. Inside a `jb-field` it takes its id,
 * `aria-describedby` and `aria-invalid` from the field.
 */
@Component({
  selector: 'select[jb-select]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FieldControl],
  host: {
    class: 'select',
    '[class.input--sm]': 'controlSize() === "sm"',
    '[class.input--lg]': 'controlSize() === "lg"',
  },
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class Select {
  /** The native element, for a template that reads its value or moves focus to it. */
  readonly element = inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;
  readonly controlSize = input<ControlSize>('md');
}
