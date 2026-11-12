import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarketingHeading, MarketingSection } from 'components';

/** "Jubilee is launching soon.": anyone leaves an address for the launch notice (L2-217). */
@Component({
  selector: 'jb-launch-notification',
  imports: [MarketingHeading, MarketingSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './launch-notification.html',
})
export class LaunchNotification {}
