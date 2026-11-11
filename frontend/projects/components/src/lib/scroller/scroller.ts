import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A row of cards that scrolls sideways and snaps to a card:
 * `<ul jb-scroller><li jb-scroller-item>…</li></ul>`.
 */
@Component({
  selector: 'ul[jb-scroller]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'scroller' },
  templateUrl: './scroller.html',
  styleUrl: './scroller.scss',
})
export class Scroller {}
