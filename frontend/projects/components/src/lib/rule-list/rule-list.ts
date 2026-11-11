import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A list whose items are parted by hairlines, each a small heading over a sentence or two:
 * `<ul jb-rule-list><li jb-rule heading="Know who you’re dealing with.">…</li></ul>`.
 */
@Component({
  selector: 'ul[jb-rule-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-rules' },
  templateUrl: './rule-list.html',
  styleUrl: './rule-list.scss',
})
export class RuleList {}
