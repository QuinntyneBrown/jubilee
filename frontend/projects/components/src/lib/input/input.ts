import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { FieldControl } from '../field/field-control';

export type ControlSize = 'sm' | 'md' | 'lg';

/**
 * A single-line text control:
 *
 *     <div jb-field label="E-mail" controlId="email" [error]="errors().email">
 *       <input jb-input name="email" type="email" />
 *     </div>
 *
 * Inside a `jb-field` it takes its id, `aria-describedby` and `aria-invalid` from the field.
 * `controlSize` is `sm`, `md` or `lg` (the native `size` attribute keeps its own meaning).
 */
@Component({
  selector: 'input[jb-input]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FieldControl],
  host: {
    class: 'input',
    '[class.input--sm]': 'controlSize() === "sm"',
    '[class.input--lg]': 'controlSize() === "lg"',
  },
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class Input {
  /** The native element, for a template that reads its value or moves focus to it. */
  readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  readonly controlSize = input<ControlSize>('md');
}
