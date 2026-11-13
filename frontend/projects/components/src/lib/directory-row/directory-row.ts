import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** What a directory row shows (L2-027): the compact one-line entry of a category group. */
export interface DirectoryRowView {
  name: string;
  tagline: string;
}

/**
 * The directory row: `<a jb-directory-row [business]="b" [routerLink]="…"></a>`. The kit cuts a
 * long name to one line with an ellipsis; the whole name stays in the DOM, so assistive
 * technology reads it in full.
 */
@Component({
  selector: 'a[jb-directory-row]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dir-row' },
  templateUrl: './directory-row.html',
  styleUrl: './directory-row.scss',
})
export class DirectoryRow {
  readonly business = input.required<DirectoryRowView>();
}
