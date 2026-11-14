import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';

/** A line of the work queue: what waits in one table (L2-274 AC3). */
export interface WorkQueueLine {
  label: string;
  /** "Next: {next}": the oldest record waiting. */
  next: string;
  count: number;
  urgent: boolean;
  /** "oldest 3d", hidden under 640 px. */
  age: string;
  /** The oldest record waiting, which the name opens (L2-274 AC4). */
  open: string;
  /** The table, which the age and the count open. */
  all: string;
}

let nextId = 0;

/**
 * A section of the overview's work queue (L2-274): its title and note over its lines, each with
 * its name, what is next, and as one control the age of the oldest and the count, red and named
 * "urgent" when it is. With no lines the content says why ("All clear"); while loading, the
 * lines are skeletons.
 *
 *     <section jb-work-queue heading="Safety" note="Answer within 24 hours" [lines]="lines"></section>
 */
@Component({
  selector: 'section[jb-work-queue]',
  imports: [RouterLink, Icon, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'work-queue', '[attr.aria-labelledby]': 'id' },
  templateUrl: './work-queue.html',
  styleUrl: './work-queue.scss',
})
export class WorkQueue {
  readonly heading = input.required<string>();
  readonly note = input<string | null>(null);
  readonly lines = input<readonly WorkQueueLine[]>([]);
  readonly loading = input(false, { transform: booleanAttribute });
  protected readonly id = `work-queue-${++nextId}`;
  protected readonly skeletons = [50, 70, 30, 50] as const;

  protected allName(line: WorkQueueLine): string {
    return `See all ${line.label}, ${line.count} waiting${line.urgent ? ', urgent' : ''}`;
  }
}
