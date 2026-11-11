import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One item of a `jb-point-list`: its heading and the words under it. */
@Component({
  selector: 'li[jb-point]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-points__item' },
  templateUrl: './point.html',
  styleUrl: './point.scss',
})
export class Point {
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}
