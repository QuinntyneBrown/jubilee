import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * A short status in words beside a control: "Saved at 2:14 p.m.", "We’ll tell you when it’s
 * back".
 *
 *     <span jb-inline-status tone="success" live><span jb-dot></span>Saved</span>
 *     <p jb-inline-status tone="success" icon="verified" live size="lg">We’ll tell you</p>
 *
 * `live` makes it a polite live region, for a status that appears or changes while the page is
 * open. The words say the state; the tone, the icon or a projected `jb-dot` only repeat it.
 * `size="lg"` gives it the height of the large button it stands in for.
 */
@Component({
  selector: 'span[jb-inline-status], p[jb-inline-status]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-status',
    '[class.inline-status--success]': "tone() === 'success'",
    '[class.inline-status--danger]': "tone() === 'danger'",
    '[class.inline-status--lg]': "size() === 'lg'",
    '[attr.role]': "live() ? 'status' : null",
  },
  templateUrl: './inline-status.html',
  styleUrl: './inline-status.scss',
})
export class InlineStatus {
  readonly tone = input<'success' | 'danger' | null>(null);
  readonly icon = input<IconName | null>(null);
  readonly live = input(false, { transform: booleanAttribute });
  readonly size = input<'md' | 'lg'>('md');
}
