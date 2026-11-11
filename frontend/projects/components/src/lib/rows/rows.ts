import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A list of rows under a rule: `<ul jb-rows><li jb-row>…</li></ul>`.
 */
@Component({
  selector: 'ul[jb-rows], ol[jb-rows]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rows' },
  templateUrl: './rows.html',
  styleUrl: './rows.scss',
})
export class Rows {}
