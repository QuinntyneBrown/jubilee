import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The house rules of a space, one a line (L2-205 AC1): `<ul jb-house-rules [rules]="…"></ul>`. */
@Component({
  selector: 'ul[jb-house-rules]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'house-rules' },
  templateUrl: './house-rules.html',
  styleUrl: './house-rules.scss',
})
export class HouseRules {
  readonly rules = input.required<readonly string[]>();
}
