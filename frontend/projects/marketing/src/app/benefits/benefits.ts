import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarketingHeading, MarketingSection, Rule, RuleList } from 'components';

/** "Trust, built in.": the three benefits for members (L2-183 AC3). */
@Component({
  selector: 'jb-benefits',
  imports: [MarketingHeading, MarketingSection, Rule, RuleList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benefits.html',
})
export class Benefits {}
