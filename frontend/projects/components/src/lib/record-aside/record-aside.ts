import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A table whose records reference this one (L2-282 AC4). */
export interface RecordPointer {
  table: string;
  label: string;
  field: string;
  count: number;
}

/** A line of a record's history (L2-282 AC5). */
export interface RecordHistoryLine {
  actor: string;
  what: string;
  when: string;
}

/**
 * Beside a record's fields (L2-282 AC4, AC5): "Points here", each table with records that
 * reference this one, "as {field}" and their count, each opening that table; then "History",
 * newest first.
 *
 *     <aside jb-record-aside [pointsHere]="pointers" [history]="lines"></aside>
 */
@Component({
  selector: 'aside[jb-record-aside]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-aside', 'aria-label': 'Related and history' },
  templateUrl: './record-aside.html',
  styleUrl: './record-aside.scss',
})
export class RecordAside {
  readonly pointsHere = input<readonly RecordPointer[]>([]);
  readonly history = input<readonly RecordHistoryLine[]>([]);

  protected lower(text: string): string {
    return text.toLowerCase();
  }
}
