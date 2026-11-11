import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/** The place of a thread row while the conversations load: `<li jb-thread-row-skeleton></li>`. */
@Component({
  selector: 'li[jb-thread-row-skeleton]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'thread' },
  templateUrl: './thread-row-skeleton.html',
  styleUrl: './thread-row-skeleton.scss',
})
export class ThreadRowSkeleton {}
