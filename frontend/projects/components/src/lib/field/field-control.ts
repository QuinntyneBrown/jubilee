import { Directive, effect, ElementRef, inject, Renderer2 } from '@angular/core';
import { Field } from './field';

/**
 * Marks the control of a `jb-field`: it takes its id from the field and is described by the
 * field's hint, counter and error. Outside a field it leaves the control as it is.
 */
@Directive({ selector: '[jbFieldControl]' })
export class FieldControl {
  constructor() {
    const field = inject(Field, { optional: true });
    if (!field) return;
    const control = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const renderer = inject(Renderer2);
    const set = (name: string, value: string | null): void => {
      if (value === null) renderer.removeAttribute(control, name);
      else renderer.setAttribute(control, name, value);
    };
    effect(() => set('id', field.controlId()));
    effect(() => set('aria-describedby', field.describedBy()));
    effect(() => set('aria-invalid', field.error() ? 'true' : null));
  }
}
