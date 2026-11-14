import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

/**
 * The breadcrumb of a record of the admin application (L2-282 AC1): "← {table}", which opens the
 * table, then the record's ID, the current page.
 *
 *     <nav jb-record-crumbs label="Members" [link]="['/', 'members']" [here]="id"></nav>
 */
@Component({
  selector: 'nav[jb-record-crumbs]',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-crumbs', 'aria-label': 'Breadcrumb' },
  templateUrl: './record-crumbs.html',
  styleUrl: './record-crumbs.scss',
})
export class RecordCrumbs {
  /** The table's name. */
  readonly label = input.required<string>();
  readonly link = input.required<readonly string[]>();
  /** The record's ID. */
  readonly here = input.required<string>();
}
