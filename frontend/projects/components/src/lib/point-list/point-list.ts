import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The list of points on the ink band, parted by hairlines:
 * `<ul jb-point-list><li jb-point heading="Free to join" text="No listing fees."></li></ul>`.
 * It is drawn for ink: it reads --jb-mkt-paper for its lines and its words.
 */
@Component({
  selector: 'ul[jb-point-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-points' },
  templateUrl: './point-list.html',
  styleUrl: './point-list.scss',
})
export class PointList {}
