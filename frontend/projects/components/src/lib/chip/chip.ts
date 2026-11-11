import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';

/**
 * A chip, on the link or the button that it is:
 *
 *     <a jb-chip routerLink="/" selected>All</a>
 *     <button jb-chip type="button" [selected]="on()" (click)="toggle()">Open now</button>
 *     <button jb-chip type="button" (click)="suggest(text)">{{ text }}</button>
 *
 * `selected` is said to assistive technology: a link that is selected is the current page
 * (`aria-current="page"`); a button given `selected` is a toggle and says whether it is pressed
 * (`aria-pressed`). A button without it is a plain action.
 */
@Component({
  selector: 'a[jb-chip], button[jb-chip]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'chip',
    '[class.chip--sm]': "size() === 'sm'",
    '[attr.aria-current]': 'current()',
    '[attr.aria-pressed]': 'pressed()',
  },
  templateUrl: './chip.html',
  styleUrl: './chip.scss',
})
export class Chip {
  private readonly toggle =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';

  readonly selected = input<boolean | undefined, unknown>(undefined, {
    transform: (value) => (value === undefined || value === null ? undefined : value !== false),
  });
  readonly size = input<'sm' | 'md'>('md');

  protected current(): string | null {
    return !this.toggle && this.selected() ? 'page' : null;
  }

  protected pressed(): string | null {
    const selected = this.selected();
    return this.toggle && selected !== undefined ? String(selected) : null;
  }
}
