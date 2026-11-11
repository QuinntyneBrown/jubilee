import { ChangeDetectionStrategy, Component } from '@angular/core';

/** "Run a Christian-owned business? Be found.": the section for owners (L2-183 AC6). */
@Component({
  selector: 'jb-for-businesses',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './for-businesses.html',
})
export class ForBusinesses {}
