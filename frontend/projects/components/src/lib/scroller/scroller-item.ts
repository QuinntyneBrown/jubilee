import { ChangeDetectionStrategy, Component } from '@angular/core';

/** One card's place in a `jb-scroller`. */
@Component({
  selector: 'li[jb-scroller-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'scroller__item' },
  templateUrl: './scroller-item.html',
  styleUrl: './scroller-item.scss',
})
export class ScrollerItem {}
