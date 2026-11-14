import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { StatusPill } from '../status-pill/status-pill';

/**
 * The head of a record of the admin application (L2-282 AC1): its name as the heading with its
 * status as a pill, its ID with "Copy ID", and the record's actions.
 *
 *     <div jb-record-head heading="Ruth Chen" status="active" [id]="id" (copied)="say('Copied')">
 *       <a slot="actions" jb-button variant="ink" routerLink="edit">Edit</a>
 *     </div>
 *
 * While `loading` the heading is a skeleton and `loadingLabel` names the page for assistive
 * technology. A new record has no `id` and so no "Copy ID"; `saved` says "Saved" before the
 * actions once a change is saved (L2-283 AC2).
 */
@Component({
  selector: 'div[jb-record-head]',
  imports: [CdkCopyToClipboard, Icon, Skeleton, StatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-head' },
  templateUrl: './record-head.html',
  styleUrl: './record-head.scss',
})
export class RecordHead {
  readonly heading = input('');
  readonly status = input<string | null>(null);
  readonly id = input('');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly loadingLabel = input('Loading…');
  readonly saved = input(false, { transform: booleanAttribute });

  /** The ID was put on the clipboard. */
  readonly copied = output<void>();
}
