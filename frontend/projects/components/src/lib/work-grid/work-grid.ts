import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The body of the overview of the admin application (L2-274, L2-275): the work queue and, from
 * 1024 px beside it, the aside of System and Recent changes.
 *
 *     <div jb-work-grid>
 *       <div>…the work queues…</div>
 *       <aside jb-admin-aside …></aside>
 *     </div>
 */
@Component({
  selector: 'div[jb-work-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'work-grid' },
  templateUrl: './work-grid.html',
  styleUrl: './work-grid.scss',
})
export class WorkGrid {}
