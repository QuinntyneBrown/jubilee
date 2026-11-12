import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * A note that floats over a corner of a `jb-app-glimpse`:
 * `<p jb-floating-note tone="trust" icon="verified">Verified by the Jubilee team</p>`.
 * `trust` sits over the top corner on the heading accent, `reply` over the bottom corner on gold.
 * The icon is decorative; the words carry the note.
 */
@Component({
  selector: 'p[jb-floating-note]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mkt-note',
    '[class.mkt-note--trust]': 'tone() === "trust"',
    '[class.mkt-note--reply]': 'tone() === "reply"',
  },
  templateUrl: './floating-note.html',
  styleUrl: './floating-note.scss',
})
export class FloatingNote {
  readonly tone = input.required<'trust' | 'reply'>();
  readonly icon = input.required<IconName>();
}
