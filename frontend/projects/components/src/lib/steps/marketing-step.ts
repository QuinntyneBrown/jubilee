import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One step of `jb-marketing-steps`: its label ("Step 1"), its heading and the projected words. */
@Component({
  selector: 'li[jb-marketing-step]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-step' },
  templateUrl: './marketing-step.html',
  styleUrl: './marketing-step.scss',
})
export class MarketingStep {
  readonly label = input.required<string>();
  readonly heading = input.required<string>();
}
