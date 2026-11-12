import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The steps something goes through, in order, joined by a line:
 *
 *     <ol jb-timeline>
 *       <li jb-timeline-step state="complete" heading="You submitted Legacy Financial"></li>
 *       <li jb-timeline-step state="current" heading="We review your listing" text="…"></li>
 *       <li jb-timeline-step heading="We review and publish"></li>
 *     </ol>
 */
@Component({
  selector: 'ol[jb-timeline]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'timeline' },
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class Timeline {}
