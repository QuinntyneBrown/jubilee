import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * One item of a `jb-accordion`: a native `details`, so it opens with a click, Enter or Space and
 * the browser's find-in-page reaches what it holds. `open` follows the element both ways.
 */
@Component({
  selector: 'details[jb-accordion-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'accordion__item',
    '[open]': 'open()',
    '(toggle)': 'toggled($event)',
  },
  templateUrl: './accordion-item.html',
  styleUrl: './accordion-item.scss',
})
export class AccordionItem {
  readonly heading = input.required<string>();
  readonly open = model(false);

  protected toggled(event: Event): void {
    this.open.set((event.target as HTMLDetailsElement).open);
  }
}
