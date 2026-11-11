import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/** The place of a notification while the list loads: `<li jb-notification-item-skeleton></li>`. */
@Component({
  selector: 'li[jb-notification-item-skeleton]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'notif' },
  templateUrl: './notification-item-skeleton.html',
  styleUrl: './notification-item-skeleton.scss',
})
export class NotificationItemSkeleton {}
