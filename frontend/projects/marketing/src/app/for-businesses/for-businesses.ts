import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon, MarketingButton } from 'components';
import { APP_URL } from '../app-url';

/** "Run a Christian-owned business? Be found.": the section for owners (L2-183 AC6). */
@Component({
  selector: 'jb-for-businesses',
  imports: [Icon, MarketingButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './for-businesses.html',
})
export class ForBusinesses {
  /** Joining, with a return to listing a business (L2-185 AC2). */
  protected readonly listUrl = inject(APP_URL) + '/join?returnUrl=%2Flist';
}
