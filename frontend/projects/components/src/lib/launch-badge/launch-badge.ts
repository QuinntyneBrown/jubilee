import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The label that says Jubilee is not open yet, above the heading of the marketing page:
 *
 *     <jb-marketing-heading …>
 *       <p slot="eyebrow" jb-launch-badge>Launching soon</p>
 *     </jb-marketing-heading>
 *
 * The words carry the state; the dot before them is decoration.
 */
@Component({
  selector: 'p[jb-launch-badge]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-badge' },
  templateUrl: './launch-badge.html',
  styleUrl: './launch-badge.scss',
})
export class LaunchBadge {}
