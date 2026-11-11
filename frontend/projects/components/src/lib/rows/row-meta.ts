import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A line of detail under the title of a `jb-row`. */
@Component({
  selector: 'div[jb-row-meta], p[jb-row-meta], span[jb-row-meta]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'row__meta' },
  templateUrl: './row-meta.html',
  styleUrl: './row-meta.scss',
})
export class RowMeta {}
