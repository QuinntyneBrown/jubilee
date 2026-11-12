import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Labels and their values, side by side and one under the other on a phone:
 *
 *     <dl jb-description-list>
 *       <div jb-description-item term="Customer" value="Samuel Park"></div>
 *       <div jb-description-item term="Answer"><span jb-badge tone="success">Yes</span></div>
 *     </dl>
 */
@Component({
  selector: 'dl[jb-description-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dl', '[class.dl--rows]': 'rows()' },
  templateUrl: './description-list.html',
  styleUrl: './description-list.scss',
})
export class DescriptionList {
  /** Ruled rows, the label left and the value right, two columns from 40rem (the facts of a space). */
  readonly rows = input(false, { transform: booleanAttribute });
}
