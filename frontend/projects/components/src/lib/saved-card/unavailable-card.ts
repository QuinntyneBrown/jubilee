import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The card of a saved business or product that is no longer listed: its name and that it is
 * gone, with nothing to follow. `<div jb-unavailable-card name="Old Mill Bakery"></div>`
 */
@Component({
  selector: 'div[jb-unavailable-card]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'biz-card', '[attr.aria-label]': 'name() + ", no longer available"' },
  templateUrl: './unavailable-card.html',
})
export class UnavailableCard {
  readonly name = input.required<string>();
}
