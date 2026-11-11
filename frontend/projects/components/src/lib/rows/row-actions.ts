import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The buttons a `jb-row` ends with. */
@Component({
  selector: 'div[jb-row-actions]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'row__actions' },
  templateUrl: './row-actions.html',
  styleUrl: './row-actions.scss',
})
export class RowActions {}
