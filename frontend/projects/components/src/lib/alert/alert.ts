import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_ICON: Record<AlertTone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert-circle',
};

/**
 * A message in place, with an icon for its tone so that colour is not the only carrier:
 *
 *     <div jb-alert tone="danger" role="alert" heading="We couldn’t save it">
 *       Your changes are still here. Try again.
 *       <button slot="actions" jb-button size="sm" type="button">Try again</button>
 *     </div>
 *
 * `role` is `alert` for a failure the member must hear now and `status` for the rest. `banner`
 * is the full-width strip under the top bar. A `jb-close-button` inside it sits at the end.
 * On a `p` the alert keeps the measure of a paragraph.
 */
@Component({
  selector: 'div[jb-alert], p[jb-alert]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'alert',
    '[class.alert--success]': 'tone() === "success"',
    '[class.alert--warning]': 'tone() === "warning"',
    '[class.alert--danger]': 'tone() === "danger"',
    '[class.banner]': 'banner()',
    '[attr.role]': 'role()',
  },
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  /** The bold first line, when the message has one. */
  readonly heading = input<string | null>(null);
  readonly role = input<'alert' | 'status' | null>('status');
  /** The icon, when the tone's own does not say it: `wifi-off` for "You’re offline". */
  readonly icon = input<IconName | null>(null);
  readonly banner = input(false, { transform: booleanAttribute });

  protected readonly shownIcon = computed(() => this.icon() ?? TONE_ICON[this.tone()]);
}
