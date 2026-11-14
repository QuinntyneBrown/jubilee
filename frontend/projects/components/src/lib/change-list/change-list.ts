import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One line of Recent changes: who, what and which record, with when (L2-275 AC4). */
export interface ChangeLine {
  actor: string;
  what: string;
  recordId: string;
  when: string;
}

/**
 * Recent changes, beside the overview's work queue (L2-275 AC4): "{first name} {what} {record ID}"
 * over the time, newest first.
 *
 *     <ol jb-change-list [changes]="lines"></ol>
 */
@Component({
  selector: 'ol[jb-change-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'change-list' },
  templateUrl: './change-list.html',
  styleUrl: './change-list.scss',
})
export class ChangeList {
  readonly changes = input<readonly ChangeLine[]>([]);
}
