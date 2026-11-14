import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The body of a record of the admin application: its fields, and from 1024 px beside them the
 * aside of related records and history.
 *
 *     <div jb-record-grid>
 *       <section aria-label="Fields">…</section>
 *       <aside jb-record-aside …></aside>
 *     </div>
 */
@Component({
  selector: 'div[jb-record-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-grid' },
  templateUrl: './record-grid.html',
  styleUrl: './record-grid.scss',
})
export class RecordGrid {}
