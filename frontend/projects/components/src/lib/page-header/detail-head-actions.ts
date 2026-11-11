import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The actions of a `jb-detail-head`: the primary one takes the room, the others keep their size. */
@Component({
  selector: 'div[jb-detail-head-actions]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'detail-head__actions' },
  templateUrl: './detail-head-actions.html',
  styleUrl: './detail-head-actions.scss',
})
export class DetailHeadActions {}
