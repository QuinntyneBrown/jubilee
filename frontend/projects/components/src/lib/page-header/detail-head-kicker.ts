import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The small line of a `jb-detail-head` that says what kind of thing the page is about. */
@Component({
  selector: 'p[jb-detail-head-kicker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'detail-head__kicker' },
  templateUrl: './detail-head-kicker.html',
  styleUrl: './detail-head-kicker.scss',
})
export class DetailHeadKicker {}
