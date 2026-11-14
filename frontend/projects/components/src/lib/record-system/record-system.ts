import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A system value of a record: its ID, or when it was created, updated or occurred. */
export interface RecordSystemValue {
  label: string;
  value: string;
  /** An ID, set in monospace. */
  code?: boolean;
}

/**
 * The system line under a record's fields (L2-282 AC3): "ID {id}", "Created {when}" and the like.
 *
 *     <p jb-record-system [values]="[{ label: 'ID', value: id, code: true }]"></p>
 */
@Component({
  selector: 'p[jb-record-system]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-system' },
  templateUrl: './record-system.html',
  styleUrl: './record-system.scss',
})
export class RecordSystem {
  readonly values = input<readonly RecordSystemValue[]>([]);
}
