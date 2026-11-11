import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * One row of `jb-rows`: what it is about in the middle, something to recognise it by before
 * and its state or its actions after.
 *
 *     <li jb-row stack>
 *       <jb-avatar slot="leading" [name]="row.customer" />
 *       <div jb-row-title>{{ row.title }}</div>
 *       <div jb-row-meta>{{ row.detail }}</div>
 *       <div jb-row-actions slot="trailing">…</div>
 *     </li>
 *
 * A row that navigates puts the link in its title: `<a jb-row-title routerLink="…">`.
 * `stack` moves the actions under the text on a phone. `labelFor` makes the text the label of
 * the control the row ends with (a switch).
 */
@Component({
  selector: 'li[jb-row]',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'row', '[class.row--stack]': 'stack()' },
  templateUrl: './row.html',
  styleUrl: './row.scss',
})
export class Row {
  readonly stack = input(false, { transform: booleanAttribute });
  /** The id of the control this row's text labels. */
  readonly labelFor = input<string | null>(null);
}
