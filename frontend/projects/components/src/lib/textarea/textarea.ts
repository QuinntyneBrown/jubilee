import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { FieldControl } from '../field/field-control';

/**
 * A multi-line text control. Inside a `jb-field` it takes its id, `aria-describedby` and
 * `aria-invalid` from the field. A block that holds one line of it (the composer) sets
 * `--jb-textarea-min-height` and `--jb-textarea-resize`.
 */
@Component({
  selector: 'textarea[jb-textarea]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FieldControl],
  host: {
    class: 'textarea',
  },
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
})
export class Textarea {
  /** The native element, for a template that reads its value or moves focus to it. */
  readonly element = inject<ElementRef<HTMLTextAreaElement>>(ElementRef).nativeElement;
}
