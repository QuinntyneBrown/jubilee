import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarketingHeading, MarketingSection, MarketingStep, MarketingSteps } from 'components';

/** "From need to handshake.": the three steps (L2-183 AC4). */
@Component({
  selector: 'jb-how-it-works',
  imports: [MarketingHeading, MarketingSection, MarketingStep, MarketingSteps],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-it-works.html',
})
export class HowItWorks {}
