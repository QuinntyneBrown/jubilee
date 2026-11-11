import { ChangeDetectionStrategy, Component } from '@angular/core';

/** "From need to handshake.": the three steps (L2-183 AC4). */
@Component({
  selector: 'jb-how-it-works',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-it-works.html',
})
export class HowItWorks {}
