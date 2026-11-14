import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Alert } from '../alert/alert';
import { IconName } from '../icon/icons';

/** A plain note, or one set as an alert of that tone. */
export type RecordNoteTone = 'plain' | 'info' | 'warning';

/**
 * What a record says under its heading (L2-284): a System table's "Jubilee writes these records
 * itself" in plain text, a private read as a warning, one's own listing as information.
 *
 *     <div jb-record-note tone="warning" icon="eye">Messages are private. …</div>
 */
@Component({
  selector: 'div[jb-record-note], p[jb-record-note]',
  imports: [NgTemplateOutlet, Alert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-note', '[class.record-note--plain]': 'tone() === "plain"' },
  templateUrl: './record-note.html',
  styleUrl: './record-note.scss',
})
export class RecordNote {
  readonly tone = input<RecordNoteTone>('plain');
  readonly icon = input<IconName | null>(null);
}
