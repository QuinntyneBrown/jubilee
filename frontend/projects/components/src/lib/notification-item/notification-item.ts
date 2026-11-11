import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * One notification, as a link to what it is about:
 *
 *     <a jb-notification-item icon="calendar" heading="Legacy Financial confirmed your meeting"
 *        text="Thu 12 Nov, 10:00 a.m." time="2 hours ago" unread href="/requests/1"></a>
 *
 * An unread notification says so in words as well as with its ground and its weight.
 */
@Component({
  selector: 'a[jb-notification-item]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'notif', '[class.notif--unread]': 'unread()' },
  templateUrl: './notification-item.html',
  styleUrl: './notification-item.scss',
})
export class NotificationItem {
  readonly icon = input.required<IconName>();
  readonly heading = input.required<string>();
  readonly text = input<string | null>(null);
  readonly time = input('');
  readonly unread = input(false, { transform: booleanAttribute });
}
