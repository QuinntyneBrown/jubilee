import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The marketing form of `jb-steps`: each step under a rule that starts with a ring, side by
 * side from the tablet layout.
 * `<ol jb-marketing-steps><li jb-marketing-step label="Step 1" heading="Look up what you need">…</li></ol>`.
 */
@Component({
  selector: 'ol[jb-marketing-steps]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-steps' },
  templateUrl: './marketing-steps.html',
  styleUrl: './marketing-steps.scss',
})
export class MarketingSteps {}
