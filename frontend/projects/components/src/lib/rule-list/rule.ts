import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One item of a `jb-rule-list`: its heading, and the projected words under it. */
@Component({
  selector: 'li[jb-rule]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-rules__item' },
  templateUrl: './rule.html',
  styleUrl: './rule.scss',
})
export class Rule {
  readonly heading = input.required<string>();
}
