import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarketingHeading, MarketingSection } from 'components';

/** "Be listed on launch day.": an owner sends their business's details before launch (L2-216). */
@Component({
  selector: 'jb-business-pre-registration',
  imports: [MarketingHeading, MarketingSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-pre-registration.html',
})
export class BusinessPreRegistration {}
