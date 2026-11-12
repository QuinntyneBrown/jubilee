import { Directive, ElementRef, OnDestroy, afterNextRender, inject, input } from '@angular/core';
import { DraftRegistry } from './draft-registry';
import { DraftSource, DraftValues } from './draft-source';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Controls that are never part of a draft (L2-116 AC4): secrets, files and what is not typed. */
const LEFT_OUT = new Set(['password', 'file', 'hidden', 'submit', 'button', 'reset', 'image']);

function controlsOf(form: HTMLFormElement): Control[] {
  return Array.from(form.elements).filter(
    (element): element is Control =>
      (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement) &&
      element.name !== '' &&
      !LEFT_OUT.has(element.type),
  );
}

/** A checkbox is named with its value when several share a name; any other control by its name. */
function keyOf(control: Control): string {
  return control.type === 'checkbox' && control.value !== 'on'
    ? `${control.name}=${control.value}`
    : control.name;
}

/**
 * FormDraftDirective (L2-116, ADR 0045): makes a form a draft source. The draft is the value of
 * the form's named controls; restoring writes the values back and tells the page with the
 * browser's own `input` and `change` events, as if the member had typed them.
 *
 *     <form jbDraft="message" (ngSubmit)="send()">…</form>
 */
@Directive({
  selector: 'form[jbDraft]',
  host: { '(input)': 'touched = true', '(change)': 'touched = true' },
})
export class FormDraftDirective implements DraftSource, OnDestroy {
  /** Names the form among those of the same address. */
  readonly name = input.required<string>({ alias: 'jbDraft' });

  private readonly form = inject<ElementRef<HTMLFormElement>>(ElementRef).nativeElement;
  private readonly registry = inject(DraftRegistry);
  private unregister: (() => void) | null = null;
  private observer: MutationObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private waiting: DraftValues = {};
  private destroyed = false;
  /** Whether the member has changed anything; an untouched form leaves no draft. */
  protected touched = false;

  constructor() {
    // After the form has its first values: `ngModel` writes them a moment after it renders.
    afterNextRender(() => {
      this.timer = setTimeout(() => {
        if (!this.destroyed) this.unregister = this.registry.register(this);
      });
    });
  }

  get key(): string {
    return this.name();
  }

  snapshot(): DraftValues | null {
    if (!this.touched) return null;
    const values: DraftValues = {};
    for (const control of controlsOf(this.form)) {
      if (control instanceof HTMLInputElement && control.type === 'radio') {
        if (control.checked) values[control.name] = control.value;
      } else if (control instanceof HTMLInputElement && control.type === 'checkbox') {
        values[keyOf(control)] = control.checked;
      } else {
        values[control.name] = control.value;
      }
    }
    // Typed and then cleared is nothing to keep.
    return Object.values(values).some((value) => value !== '' && value !== false) ? values : null;
  }

  restore(values: DraftValues): void {
    this.waiting = { ...values };
    this.touched = true;
    this.apply();
    // A control that is shown only after another has its value (an address, once "Ship" is
    // chosen) takes its value when it appears.
    if (Object.keys(this.waiting).length > 0 && typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(() => this.apply());
      this.observer.observe(this.form, { childList: true, subtree: true });
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.observer?.disconnect();
    this.unregister?.();
  }

  private apply(): void {
    for (const control of controlsOf(this.form)) {
      const key = keyOf(control);
      if (!(key in this.waiting)) continue;
      const value = this.waiting[key];
      if (control instanceof HTMLInputElement && control.type === 'radio') {
        if (control.value !== value) continue;
        control.checked = true;
      } else if (control instanceof HTMLInputElement && control.type === 'checkbox') {
        control.checked = value === true;
      } else {
        control.value = String(value);
        if (control instanceof HTMLSelectElement && control.value !== String(value)) continue;
      }
      delete this.waiting[key];
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (Object.keys(this.waiting).length === 0) {
      this.observer?.disconnect();
      this.observer = null;
    }
  }
}
