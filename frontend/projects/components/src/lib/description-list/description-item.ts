import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * One label and its value in a `jb-description-list`. The value is `value`, or what is projected
 * when it is more than words (a link, a badge, a price). `preserveLines` keeps the line breaks of
 * a value someone typed.
 *
 * The host is the `div` HTML allows around a `dt` and its `dd`; it draws no box, so both are
 * cells of the list's grid.
 */
@Component({
  selector: 'div[jb-description-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dl__item' },
  templateUrl: './description-item.html',
  styleUrl: './description-item.scss',
})
export class DescriptionItem {
  readonly term = input.required<string>();
  readonly value = input<string | number | null | undefined>(null);
  readonly preserveLines = input(false, { transform: booleanAttribute });
}
