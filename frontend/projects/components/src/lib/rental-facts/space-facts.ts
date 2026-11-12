import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Up to four key facts of a space as a ruled grid, two across on a phone and four from 40rem
 * (L2-196 AC1): `<ul jb-space-facts [facts]="space.facts"></ul>`.
 */
@Component({
  selector: 'ul[jb-space-facts]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'space-facts' },
  templateUrl: './space-facts.html',
  styleUrl: './space-facts.scss',
})
export class SpaceFacts {
  readonly facts = input.required<readonly string[]>();
}
