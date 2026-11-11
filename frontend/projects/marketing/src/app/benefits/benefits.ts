import { ChangeDetectionStrategy, Component } from '@angular/core';

/** "Trust, built in.": the three benefits for members (L2-183 AC3). */
@Component({
  selector: 'jb-benefits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benefits.html',
})
export class Benefits {}
