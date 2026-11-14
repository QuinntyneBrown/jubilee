import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A record a dialog is about to delete: its name and its ID. */
export interface DoomedRecord {
  id: string;
  name: string;
}

/**
 * The records a delete dialog names (L2-281 AC1, AC2): each one's name, cut short when long, and
 * its ID in the mono face, in a bordered list.
 *
 *     <ul jb-doomed-list [records]="records"></ul>
 */
@Component({
  selector: 'ul[jb-doomed-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'doomed' },
  templateUrl: './doomed-list.html',
  styleUrl: './doomed-list.scss',
})
export class DoomedList {
  readonly records = input.required<readonly DoomedRecord[]>();
}
