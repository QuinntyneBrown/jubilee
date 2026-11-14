import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The head of a table of the admin application (L2-276 AC2): its heading, and beside it Export and
 * "New {table, singular}".
 *
 *     <div jb-records-head>
 *       <div jb-admin-heading eyebrow="Accounts" heading="Members">…</div>
 *       <a slot="actions" jb-button variant="primary" routerLink="new">New member</a>
 *     </div>
 */
@Component({
  selector: 'div[jb-records-head]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'records-head' },
  templateUrl: './records-head.html',
  styleUrl: './records-head.scss',
})
export class RecordsHead {}
