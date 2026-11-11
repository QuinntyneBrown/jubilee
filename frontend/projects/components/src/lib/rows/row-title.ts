import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The title of a `jb-row`. On a link it is how the row navigates. */
@Component({
  selector: 'div[jb-row-title], p[jb-row-title], span[jb-row-title], a[jb-row-title]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'row__title' },
  templateUrl: './row-title.html',
  styleUrl: './row-title.scss',
})
export class RowTitle {}
